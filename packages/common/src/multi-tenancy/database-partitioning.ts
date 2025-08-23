/**
 * Database partitioning utilities for tenant isolation
 * Provides tenant-specific database connections and query routing
 */

import { Pool, PoolClient } from 'pg';
import { tenantContext, TenantInfo } from './tenant-context';

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

export interface TenantDatabaseConfig extends DatabaseConfig {
    tenantId: string;
    schemaName: string;
    partitionStrategy: 'schema' | 'database' | 'table_prefix';
}

export type PartitionStrategy = 'schema' | 'database' | 'table_prefix';

export class DatabasePartitionManager {
    private static instance: DatabasePartitionManager;
    private masterPool: Pool;
    private tenantPools = new Map<string, Pool>();
    private partitionStrategy: PartitionStrategy = 'schema';

    static getInstance(): DatabasePartitionManager {
        if (!DatabasePartitionManager.instance) {
            DatabasePartitionManager.instance = new DatabasePartitionManager();
        }
        return DatabasePartitionManager.instance;
    }

    /**
     * Initialize database partition manager
     */
    async initialize(
        masterConfig: DatabaseConfig,
        strategy: PartitionStrategy = 'schema'
    ): Promise<void> {
        this.partitionStrategy = strategy;
        this.masterPool = new Pool({
            host: masterConfig.host,
            port: masterConfig.port,
            database: masterConfig.database,
            user: masterConfig.username,
            password: masterConfig.password,
            ssl: masterConfig.ssl,
            max: masterConfig.maxConnections || 20,
            idleTimeoutMillis: masterConfig.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: masterConfig.connectionTimeoutMillis || 2000
        });

        // Test master connection
        const client = await this.masterPool.connect();
        await client.query('SELECT NOW()');
        client.release();

        console.log('Database partition manager initialized');
    }

    /**
     * Get database connection for current tenant
     */
    async getTenantConnection(): Promise<PoolClient> {
        const tenantId = tenantContext.getCurrentTenantId();
        if (!tenantId) {
            throw new Error('No tenant context available');
        }

        return this.getTenantConnectionById(tenantId);
    }

    /**
     * Get database connection for specific tenant
     */
    async getTenantConnectionById(tenantId: string): Promise<PoolClient> {
        let pool = this.tenantPools.get(tenantId);

        if (!pool) {
            pool = await this.createTenantPool(tenantId);
            this.tenantPools.set(tenantId, pool);
        }

        const client = await pool.connect();

        // Set schema or table prefix based on strategy
        if (this.partitionStrategy === 'schema') {
            await client.query(`SET search_path TO tenant_${tenantId}, public`);
        }

        return client;
    }

    /**
     * Execute query with tenant isolation
     */
    async query(text: string, params?: any[]): Promise<any> {
        const client = await this.getTenantConnection();

        try {
            const modifiedQuery = this.modifyQueryForTenant(text);
            return await client.query(modifiedQuery, params);
        } finally {
            client.release();
        }
    }

    /**
     * Execute transaction with tenant isolation
     */
    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.getTenantConnection();

        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create tenant database schema/partition
     */
    async createTenantPartition(tenant: TenantInfo): Promise<void> {
        const client = await this.masterPool.connect();

        try {
            switch (this.partitionStrategy) {
                case 'schema':
                    await this.createTenantSchema(client, tenant.id);
                    break;
                case 'database':
                    await this.createTenantDatabase(client, tenant.id);
                    break;
                case 'table_prefix':
                    await this.createTenantTables(client, tenant.id);
                    break;
            }
        } finally {
            client.release();
        }
    }

    /**
     * Drop tenant database schema/partition
     */
    async dropTenantPartition(tenantId: string): Promise<void> {
        const client = await this.masterPool.connect();

        try {
            switch (this.partitionStrategy) {
                case 'schema':
                    await client.query(`DROP SCHEMA IF EXISTS tenant_${tenantId} CASCADE`);
                    break;
                case 'database':
                    await client.query(`DROP DATABASE IF EXISTS tenant_${tenantId}`);
                    break;
                case 'table_prefix':
                    await this.dropTenantTables(client, tenantId);
                    break;
            }

            // Remove tenant pool
            const pool = this.tenantPools.get(tenantId);
            if (pool) {
                await pool.end();
                this.tenantPools.delete(tenantId);
            }
        } finally {
            client.release();
        }
    }

    /**
     * Migrate tenant schema
     */
    async migrateTenantSchema(tenantId: string, migrations: string[]): Promise<void> {
        const client = await this.getTenantConnectionById(tenantId);

        try {
            for (const migration of migrations) {
                await client.query(migration);
            }
        } finally {
            client.release();
        }
    }

    /**
     * Get tenant statistics
     */
    async getTenantStats(tenantId: string): Promise<any> {
        const client = await this.getTenantConnectionById(tenantId);

        try {
            const schemaName = `tenant_${tenantId}`;

            const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables 
        WHERE schemaname = $1
      `, [schemaName]);

            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Private methods
     */
    private async createTenantPool(tenantId: string): Promise<Pool> {
        const config = await this.getTenantDatabaseConfig(tenantId);

        return new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
            password: config.password,
            ssl: config.ssl,
            max: config.maxConnections || 10,
            idleTimeoutMillis: config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config.connectionTimeoutMillis || 2000
        });
    }

    private async getTenantDatabaseConfig(tenantId: string): Promise<TenantDatabaseConfig> {
        // In production, this would fetch tenant-specific database config
        // For now, use master config with tenant schema
        const masterConfig = this.getMasterConfig();

        return {
            ...masterConfig,
            tenantId,
            schemaName: `tenant_${tenantId}`,
            partitionStrategy: this.partitionStrategy
        };
    }

    private getMasterConfig(): DatabaseConfig {
        return {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'multiservice_db',
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.DB_SSL === 'true'
        };
    }

    private async createTenantSchema(client: PoolClient, tenantId: string): Promise<void> {
        const schemaName = `tenant_${tenantId}`;

        // Create schema
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

        // Create tenant-specific tables
        const tables = await this.getTableDefinitions();

        for (const [tableName, definition] of Object.entries(tables)) {
            await client.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (
          ${definition}
        )
      `);
        }

        // Create indexes
        const indexes = await this.getIndexDefinitions();

        for (const [indexName, definition] of Object.entries(indexes)) {
            await client.query(`
        CREATE INDEX IF NOT EXISTS ${indexName}_${tenantId} 
        ON ${schemaName}.${definition}
      `);
        }
    }

    private async createTenantDatabase(client: PoolClient, tenantId: string): Promise<void> {
        const dbName = `tenant_${tenantId}`;

        await client.query(`CREATE DATABASE ${dbName}`);

        // Connect to new database and create tables
        const tenantPool = new Pool({
            ...this.getMasterConfig(),
            database: dbName
        });

        const tenantClient = await tenantPool.connect();

        try {
            const tables = await this.getTableDefinitions();

            for (const [tableName, definition] of Object.entries(tables)) {
                await tenantClient.query(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            ${definition}
          )
        `);
            }
        } finally {
            tenantClient.release();
            await tenantPool.end();
        }
    }

    private async createTenantTables(client: PoolClient, tenantId: string): Promise<void> {
        const tables = await this.getTableDefinitions();

        for (const [tableName, definition] of Object.entries(tables)) {
            const tenantTableName = `${tenantId}_${tableName}`;
            await client.query(`
        CREATE TABLE IF NOT EXISTS ${tenantTableName} (
          ${definition}
        )
      `);
        }
    }

    private async dropTenantTables(client: PoolClient, tenantId: string): Promise<void> {
        const tables = await this.getTableDefinitions();

        for (const tableName of Object.keys(tables)) {
            const tenantTableName = `${tenantId}_${tableName}`;
            await client.query(`DROP TABLE IF EXISTS ${tenantTableName} CASCADE`);
        }
    }

    private modifyQueryForTenant(query: string): string {
        if (this.partitionStrategy === 'table_prefix') {
            const tenantId = tenantContext.getCurrentTenantId();
            if (tenantId) {
                // Replace table names with tenant-prefixed versions
                // This is a simplified implementation
                return query.replace(/\b(users|products|orders|bookings|rides|payments)\b/g, `${tenantId}_$1`);
            }
        }

        return query;
    }

    private async getTableDefinitions(): Promise<Record<string, string>> {
        return {
            users: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `,
            products: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        category_id UUID,
        vendor_id UUID,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `,
            orders: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'pending',
        payment_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `,
            bookings: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        property_id UUID NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        guests INTEGER DEFAULT 1,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `,
            rides: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        driver_id UUID,
        pickup_location JSONB NOT NULL,
        destination_location JSONB NOT NULL,
        fare DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'requested',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `,
            payments: `
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        order_id UUID,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50),
        gateway VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `
        };
    }

    private async getIndexDefinitions(): Promise<Record<string, string>> {
        return {
            idx_users_email: 'users(email)',
            idx_products_category: 'products(category_id)',
            idx_orders_user: 'orders(user_id)',
            idx_bookings_user: 'bookings(user_id)',
            idx_rides_user: 'rides(user_id)',
            idx_payments_user: 'payments(user_id)'
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        // Close all tenant pools
        for (const [tenantId, pool] of this.tenantPools) {
            await pool.end();
        }
        this.tenantPools.clear();

        // Close master pool
        if (this.masterPool) {
            await this.masterPool.end();
        }
    }
}

// Export singleton instance
export const dbPartitionManager = DatabasePartitionManager.getInstance();