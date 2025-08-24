#!/usr/bin/env ts-node

/**
 * Legacy Data Migration Script
 * 
 * This script migrates data from legacy services to the new consolidated services:
 * - MongoDB to PostgreSQL migration
 * - User data consolidation
 * - Taxi service data merge
 * - E-commerce data migration
 */

import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

interface MigrationConfig {
    mongodb: {
        url: string;
        database: string;
    };
    postgresql: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
}

interface MigrationStats {
    users: { migrated: number; errors: number };
    rides: { migrated: number; errors: number };
    products: { migrated: number; errors: number };
    orders: { migrated: number; errors: number };
}

class LegacyDataMigrator {
    private mongoClient: MongoClient;
    private pgPool: Pool;
    private stats: MigrationStats = {
        users: { migrated: 0, errors: 0 },
        rides: { migrated: 0, errors: 0 },
        products: { migrated: 0, errors: 0 },
        orders: { migrated: 0, errors: 0 }
    };

    constructor(private config: MigrationConfig) {
        this.mongoClient = new MongoClient(config.mongodb.url);
        this.pgPool = new Pool(config.postgresql);
    }

    async migrate(): Promise<void> {
        console.log('🚀 Starting Legacy Data Migration...\n');

        try {
            // Connect to databases
            await this.mongoClient.connect();
            console.log('✅ Connected to MongoDB');

            await this.pgPool.query('SELECT NOW()');
            console.log('✅ Connected to PostgreSQL\n');

            // Run migrations in order
            await this.migrateUsers();
            await this.migrateTaxiData();
            await this.migrateEcommerceData();

            console.log('\n🎉 Migration completed successfully!');
            this.printStats();

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        } finally {
            await this.mongoClient.close();
            await this.pgPool.end();
        }
    }

    /**
     * Migrate users from giga_main MongoDB to authentication service PostgreSQL
     */
    private async migrateUsers(): Promise<void> {
        console.log('📋 Migrating users from giga_main...');

        const db = this.mongoClient.db(this.config.mongodb.database);
        const usersCollection = db.collection('users');

        const users = await usersCollection.find({}).toArray();
        console.log(`   Found ${users.length} users to migrate`);

        for (const user of users) {
            try {
                // Check if user already exists
                const existingUser = await this.pgPool.query(
                    'SELECT id FROM users WHERE email = $1',
                    [user.email]
                );

                if (existingUser.rows.length > 0) {
                    console.log(`   ⚠️  User ${user.email} already exists, skipping`);
                    continue;
                }

                // Migrate user data
                const userData = {
                    id: user._id.toString(),
                    email: user.email,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    phoneNumber: user.phoneNumber || '',
                    profilePicture: user.profilePicture || '',
                    isVerified: user.isEmailVerified || false,
                    passwordHash: user.password || null,
                    oauthProvider: user.oauthProvider || null,
                    oauthId: user.oauthId || null,
                    oauthAccessToken: user.oauthAccessToken || null,
                    oauthRefreshToken: user.oauthRefreshToken || null,
                    metadata: JSON.stringify({
                        country: user.country,
                        address: user.address,
                        city: user.city,
                        zipCode: user.zipCode,
                        gender: user.gender,
                        weight: user.weight,
                        maritalStatus: user.maritalStatus,
                        ageGroup: user.ageGroup,
                        areaOfInterest: user.areaOfInterest,
                        taxiProfileType: user.taxiProfileType,
                        averageRating: user.averageRating
                    }),
                    createdAt: user.createdAt || new Date(),
                    updatedAt: user.updatedAt || new Date()
                };

                await this.pgPool.query(`
                    INSERT INTO users (
                        id, email, first_name, last_name, phone_number, profile_picture,
                        is_verified, password_hash, oauth_provider, oauth_id,
                        oauth_access_token, oauth_refresh_token, metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `, [
                    userData.id, userData.email, userData.firstName, userData.lastName,
                    userData.phoneNumber, userData.profilePicture, userData.isVerified,
                    userData.passwordHash, userData.oauthProvider, userData.oauthId,
                    userData.oauthAccessToken, userData.oauthRefreshToken,
                    userData.metadata, userData.createdAt, userData.updatedAt
                ]);

                this.stats.users.migrated++;

                if (this.stats.users.migrated % 100 === 0) {
                    console.log(`   ✅ Migrated ${this.stats.users.migrated} users`);
                }

            } catch (error) {
                console.error(`   ❌ Failed to migrate user ${user.email}:`, error);
                this.stats.users.errors++;
            }
        }

        console.log(`✅ User migration completed: ${this.stats.users.migrated} migrated, ${this.stats.users.errors} errors\n`);
    }

    /**
     * Migrate taxi data from giga_taxi_main and giga_taxi_driver
     */
    private async migrateTaxiData(): Promise<void> {
        console.log('📋 Migrating taxi data...');

        const db = this.mongoClient.db(this.config.mongodb.database);

        // Migrate rides
        const ridesCollection = db.collection('rides');
        const rides = await ridesCollection.find({}).toArray();
        console.log(`   Found ${rides.length} rides to migrate`);

        for (const ride of rides) {
            try {
                // Check if ride already exists
                const existingRide = await this.pgPool.query(
                    'SELECT id FROM rides WHERE legacy_id = $1',
                    [ride._id.toString()]
                );

                if (existingRide.rows.length > 0) {
                    continue;
                }

                const rideData = {
                    legacyId: ride._id.toString(),
                    driverId: ride.driverId?.toString(),
                    customerId: ride.customerId?.toString(),
                    status: ride.status || 'pending',
                    pickupLocation: JSON.stringify({
                        lat: ride.pickupLocation?.lat || 0,
                        lon: ride.pickupLocation?.lon || 0
                    }),
                    dropOffLocation: JSON.stringify({
                        lat: ride.dropOffLocation?.lat || 0,
                        lon: ride.dropOffLocation?.lon || 0
                    }),
                    distance: ride.distance || 0,
                    estimatedFee: ride.estimatedFee || 0,
                    finalFee: ride.finalFee || 0,
                    rideType: ride.rideType || 'regular',
                    createdAt: ride.createdAt || new Date(),
                    updatedAt: ride.updatedAt || new Date()
                };

                await this.pgPool.query(`
                    INSERT INTO rides (
                        legacy_id, driver_id, customer_id, status, pickup_location,
                        drop_off_location, distance, estimated_fee, final_fee,
                        ride_type, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    rideData.legacyId, rideData.driverId, rideData.customerId,
                    rideData.status, rideData.pickupLocation, rideData.dropOffLocation,
                    rideData.distance, rideData.estimatedFee, rideData.finalFee,
                    rideData.rideType, rideData.createdAt, rideData.updatedAt
                ]);

                this.stats.rides.migrated++;

            } catch (error) {
                console.error(`   ❌ Failed to migrate ride ${ride._id}:`, error);
                this.stats.rides.errors++;
            }
        }

        console.log(`✅ Taxi data migration completed: ${this.stats.rides.migrated} rides migrated, ${this.stats.rides.errors} errors\n`);
    }

    /**
     * Migrate e-commerce data from ecommerce-backend
     */
    private async migrateEcommerceData(): Promise<void> {
        console.log('📋 Migrating e-commerce data...');

        // Note: This assumes the ecommerce-backend is already using PostgreSQL
        // If it's using MongoDB, we would need to adapt this section

        try {
            // Check if we need to migrate from a different database
            const sourcePool = new Pool({
                host: process.env.LEGACY_ECOMMERCE_DB_HOST || 'localhost',
                port: parseInt(process.env.LEGACY_ECOMMERCE_DB_PORT || '5432'),
                database: process.env.LEGACY_ECOMMERCE_DB_NAME || 'ecommerce_legacy',
                user: process.env.LEGACY_ECOMMERCE_DB_USER || 'postgres',
                password: process.env.LEGACY_ECOMMERCE_DB_PASSWORD || 'password'
            });

            // Migrate products
            const productsResult = await sourcePool.query('SELECT * FROM products ORDER BY created_at');
            console.log(`   Found ${productsResult.rows.length} products to migrate`);

            for (const product of productsResult.rows) {
                try {
                    // Check if product already exists
                    const existingProduct = await this.pgPool.query(
                        'SELECT id FROM products WHERE sku = $1',
                        [product.sku]
                    );

                    if (existingProduct.rows.length > 0) {
                        continue;
                    }

                    await this.pgPool.query(`
                        INSERT INTO products (
                            id, name, description, short_description, sku, price,
                            compare_price, cost_price, category_id, vendor_id, brand,
                            weight, dimensions, images, tags, meta_title, meta_description,
                            is_active, is_featured, requires_shipping, track_inventory,
                            created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                    `, [
                        product.id, product.name, product.description, product.short_description,
                        product.sku, product.price, product.compare_price, product.cost_price,
                        product.category_id, product.vendor_id, product.brand, product.weight,
                        product.dimensions, product.images, product.tags, product.meta_title,
                        product.meta_description, product.is_active, product.is_featured,
                        product.requires_shipping, product.track_inventory,
                        product.created_at, product.updated_at
                    ]);

                    this.stats.products.migrated++;

                } catch (error) {
                    console.error(`   ❌ Failed to migrate product ${product.sku}:`, error);
                    this.stats.products.errors++;
                }
            }

            // Migrate orders
            const ordersResult = await sourcePool.query('SELECT * FROM orders ORDER BY created_at');
            console.log(`   Found ${ordersResult.rows.length} orders to migrate`);

            for (const order of ordersResult.rows) {
                try {
                    // Check if order already exists
                    const existingOrder = await this.pgPool.query(
                        'SELECT id FROM orders WHERE order_number = $1',
                        [order.order_number]
                    );

                    if (existingOrder.rows.length > 0) {
                        continue;
                    }

                    await this.pgPool.query(`
                        INSERT INTO orders (
                            id, order_number, user_id, status, payment_status, fulfillment_status,
                            subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
                            billing_address, shipping_address, payment_method, payment_reference,
                            shipping_method, tracking_number, notes, tags, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                    `, [
                        order.id, order.order_number, order.user_id, order.status,
                        order.payment_status, order.fulfillment_status, order.subtotal,
                        order.tax_amount, order.shipping_amount, order.discount_amount,
                        order.total_amount, order.billing_address, order.shipping_address,
                        order.payment_method, order.payment_reference, order.shipping_method,
                        order.tracking_number, order.notes, order.tags,
                        order.created_at, order.updated_at
                    ]);

                    // Migrate order items
                    const orderItemsResult = await sourcePool.query(
                        'SELECT * FROM order_items WHERE order_id = $1',
                        [order.id]
                    );

                    for (const item of orderItemsResult.rows) {
                        await this.pgPool.query(`
                            INSERT INTO order_items (
                                id, order_id, product_id, variant_id, vendor_id,
                                product_name, variant_name, sku, quantity, unit_price,
                                total_price, fulfillment_status, created_at, updated_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                        `, [
                            item.id, item.order_id, item.product_id, item.variant_id,
                            item.vendor_id, item.product_name, item.variant_name,
                            item.sku, item.quantity, item.unit_price, item.total_price,
                            item.fulfillment_status, item.created_at, item.updated_at
                        ]);
                    }

                    this.stats.orders.migrated++;

                } catch (error) {
                    console.error(`   ❌ Failed to migrate order ${order.order_number}:`, error);
                    this.stats.orders.errors++;
                }
            }

            await sourcePool.end();

        } catch (error) {
            console.error('   ❌ E-commerce data migration failed:', error);
        }

        console.log(`✅ E-commerce migration completed: ${this.stats.products.migrated} products, ${this.stats.orders.migrated} orders migrated\n`);
    }

    /**
     * Print migration statistics
     */
    private printStats(): void {
        console.log('\n📊 Migration Statistics:');
        console.log('┌─────────────┬──────────┬────────┐');
        console.log('│ Entity      │ Migrated │ Errors │');
        console.log('├─────────────┼──────────┼────────┤');
        console.log(`│ Users       │ ${this.stats.users.migrated.toString().padStart(8)} │ ${this.stats.users.errors.toString().padStart(6)} │`);
        console.log(`│ Rides       │ ${this.stats.rides.migrated.toString().padStart(8)} │ ${this.stats.rides.errors.toString().padStart(6)} │`);
        console.log(`│ Products    │ ${this.stats.products.migrated.toString().padStart(8)} │ ${this.stats.products.errors.toString().padStart(6)} │`);
        console.log(`│ Orders      │ ${this.stats.orders.migrated.toString().padStart(8)} │ ${this.stats.orders.errors.toString().padStart(6)} │`);
        console.log('└─────────────┴──────────┴────────┘');

        const totalMigrated = Object.values(this.stats).reduce((sum, stat) => sum + stat.migrated, 0);
        const totalErrors = Object.values(this.stats).reduce((sum, stat) => sum + stat.errors, 0);

        console.log(`\n📈 Total: ${totalMigrated} records migrated, ${totalErrors} errors`);

        if (totalErrors > 0) {
            console.log('⚠️  Please review the errors above and consider re-running the migration for failed records.');
        }
    }
}

// Configuration
const config: MigrationConfig = {
    mongodb: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
        database: process.env.MONGODB_DATABASE || 'giga'
    },
    postgresql: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'consolidated_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    }
};

// Run migration if this script is executed directly
if (require.main === module) {
    const migrator = new LegacyDataMigrator(config);
    migrator.migrate().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

export { LegacyDataMigrator };