import { getRedisClient } from './redis-client';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface LocationData {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp: number;
}

export interface InventoryData {
    productId: string;
    quantity: number;
    reserved: number;
    available: number;
    lastUpdated: number;
    warehouseId?: string;
}

export interface DriverStatus {
    driverId: string;
    status: 'available' | 'busy' | 'offline';
    location: LocationData;
    vehicleInfo?: {
        type: string;
        plateNumber: string;
        capacity: number;
    };
    currentRideId?: string;
}

/**
 * Real-time cache manager for location and inventory data
 */
export class RealtimeCacheManager extends EventEmitter {
    private redis = getRedisClient();
    private locationTTL = 300; // 5 minutes for location data
    private inventoryTTL = 60; // 1 minute for inventory data
    private statusTTL = 600; // 10 minutes for driver status

    constructor() {
        super();
    }

    /**
     * Driver location management
     */
    async updateDriverLocation(driverId: string, location: LocationData): Promise<void> {
        try {
            const locationKey = `realtime:driver:${driverId}:location`;
            const geoKey = `geo:drivers`;

            // Store detailed location data
            await this.redis.set(locationKey, location, this.locationTTL);

            // Add to geospatial index for proximity queries
            await this.redis.getClient().geoadd(
                geoKey,
                location.longitude,
                location.latitude,
                driverId
            );

            // Set expiration for geo data
            await this.redis.expire(geoKey, this.locationTTL);

            // Emit location update event
            this.emit('driver.location.updated', { driverId, location });

            Logger.debug(`Updated location for driver ${driverId}`);
        } catch (error) {
            Logger.error(`Error updating driver location for ${driverId}:`, error as Error);
        }
    }

    /**
     * Get driver location
     */
    async getDriverLocation(driverId: string): Promise<LocationData | null> {
        try {
            const locationKey = `realtime:driver:${driverId}:location`;
            return await this.redis.get<LocationData>(locationKey);
        } catch (error) {
            Logger.error(`Error getting driver location for ${driverId}:`, error as Error);
            return null;
        }
    }

    /**
     * Find nearby drivers
     */
    async findNearbyDrivers(
        latitude: number,
        longitude: number,
        radiusKm: number = 5,
        limit: number = 10
    ): Promise<Array<{ driverId: string; distance: number; location?: LocationData }>> {
        try {
            const geoKey = `geo:drivers`;

            // Get nearby drivers using Redis GEORADIUS
            const nearbyDrivers = await this.redis.getClient().georadius(
                geoKey,
                longitude,
                latitude,
                radiusKm,
                'km',
                'WITHDIST',
                'ASC',
                'COUNT',
                limit
            );

            const results: Array<{ driverId: string; distance: number; location?: LocationData }> = [];

            for (const [driverId, distance] of nearbyDrivers as any[]) {
                const location = await this.getDriverLocation(driverId as string);
                results.push({
                    driverId: String(driverId),
                    distance: parseFloat(String(distance)),
                    location
                });
            }

            return results;
        } catch (error) {
            Logger.error(`Error finding nearby drivers:`, error as Error);
            return [];
        }
    }

    /**
     * Update driver status
     */
    async updateDriverStatus(driverId: string, status: DriverStatus): Promise<void> {
        try {
            const statusKey = `realtime:driver:${driverId}:status`;
            const availableKey = `drivers:available`;
            const busyKey = `drivers:busy`;

            // Store driver status
            await this.redis.set(statusKey, status, this.statusTTL);

            // Update availability sets
            await this.redis.getClient().srem(availableKey, driverId);
            await this.redis.getClient().srem(busyKey, driverId);

            if (status.status === 'available') {
                await this.redis.sadd(availableKey, driverId);
                await this.redis.expire(availableKey, this.statusTTL);
            } else if (status.status === 'busy') {
                await this.redis.sadd(busyKey, driverId);
                await this.redis.expire(busyKey, this.statusTTL);
            }

            // Update location if provided
            if (status.location) {
                await this.updateDriverLocation(driverId, status.location);
            }

            this.emit('driver.status.updated', { driverId, status });

            Logger.debug(`Updated status for driver ${driverId}: ${status.status}`);
        } catch (error) {
            Logger.error(`Error updating driver status for ${driverId}:`, error as Error);
        }
    }

    /**
     * Get available drivers
     */
    async getAvailableDrivers(): Promise<string[]> {
        try {
            const availableKey = `drivers:available`;
            return await this.redis.smembers(availableKey);
        } catch (error) {
            Logger.error('Error getting available drivers:', error as Error);
            return [];
        }
    }

    /**
     * Get available drivers near location
     */
    async getAvailableDriversNear(
        latitude: number,
        longitude: number,
        radiusKm: number = 5
    ): Promise<Array<{ driverId: string; distance: number; status: DriverStatus }>> {
        try {
            const nearbyDrivers = await this.findNearbyDrivers(latitude, longitude, radiusKm);
            const availableDrivers = await this.getAvailableDrivers();
            const availableSet = new Set(availableDrivers);

            const results: Array<{ driverId: string; distance: number; status: DriverStatus }> = [];

            for (const driver of nearbyDrivers) {
                if (availableSet.has(driver.driverId)) {
                    const status = await this.getDriverStatus(driver.driverId);
                    if (status) {
                        results.push({
                            driverId: driver.driverId,
                            distance: driver.distance,
                            status
                        });
                    }
                }
            }

            return results;
        } catch (error) {
            Logger.error('Error getting available drivers near location:', error as Error);
            return [];
        }
    }

    /**
     * Get driver status
     */
    async getDriverStatus(driverId: string): Promise<DriverStatus | null> {
        try {
            const statusKey = `realtime:driver:${driverId}:status`;
            return await this.redis.get<DriverStatus>(statusKey);
        } catch (error) {
            Logger.error(`Error getting driver status for ${driverId}:`, error as Error);
            return null;
        }
    }

    /**
     * Remove driver from real-time tracking
     */
    async removeDriver(driverId: string): Promise<void> {
        try {
            const locationKey = `realtime:driver:${driverId}:location`;
            const statusKey = `realtime:driver:${driverId}:status`;
            const geoKey = `geo:drivers`;
            const availableKey = `drivers:available`;
            const busyKey = `drivers:busy`;

            // Remove all driver data
            await Promise.all([
                this.redis.del(locationKey),
                this.redis.del(statusKey),
                this.redis.getClient().zrem(geoKey, driverId),
                this.redis.getClient().srem(availableKey, driverId),
                this.redis.getClient().srem(busyKey, driverId)
            ]);

            Logger.debug(`Removed driver ${driverId} from real-time tracking`);
        } catch (error) {
            Logger.error(`Error removing driver ${driverId}:`, error as Error);
        }
    }

    /**
     * Inventory management
     */
    async updateInventory(productId: string, inventory: InventoryData): Promise<void> {
        try {
            const inventoryKey = `realtime:inventory:${productId}`;
            const lowStockKey = `inventory:low-stock`;
            const outOfStockKey = `inventory:out-of-stock`;

            // Store inventory data
            await this.redis.set(inventoryKey, inventory, this.inventoryTTL);

            // Update stock status sets
            await this.redis.getClient().srem(lowStockKey, productId);
            await this.redis.getClient().srem(outOfStockKey, productId);

            if (inventory.available === 0) {
                await this.redis.sadd(outOfStockKey, productId);
                await this.redis.expire(outOfStockKey, this.inventoryTTL);
            } else if (inventory.available < 10) { // Low stock threshold
                await this.redis.sadd(lowStockKey, productId);
                await this.redis.expire(lowStockKey, this.inventoryTTL);
            }

            this.emit('inventory.updated', { productId, inventory });

            Logger.debug(`Updated inventory for product ${productId}: ${inventory.available} available`);
        } catch (error) {
            Logger.error(`Error updating inventory for product ${productId}:`, error as Error);
        }
    }

    /**
     * Get product inventory
     */
    async getInventory(productId: string): Promise<InventoryData | null> {
        try {
            const inventoryKey = `realtime:inventory:${productId}`;
            return await this.redis.get<InventoryData>(inventoryKey);
        } catch (error) {
            logger.error(`Error getting inventory for product ${productId}:`, error);
            return null;
        }
    }

    /**
     * Get multiple product inventories
     */
    async getMultipleInventories(productIds: string[]): Promise<Record<string, InventoryData | null>> {
        try {
            const keys = productIds.map(id => `realtime:inventory:${id}`);
            const results: Record<string, InventoryData | null> = {};

            for (let i = 0; i < productIds.length; i++) {
                const inventory = await this.redis.get<InventoryData>(keys[i]);
                results[productIds[i]] = inventory;
            }

            return results;
        } catch (error) {
            logger.error('Error getting multiple inventories:', error);
            return {};
        }
    }

    /**
     * Reserve inventory
     */
    async reserveInventory(productId: string, quantity: number): Promise<boolean> {
        try {
            const inventoryKey = `realtime:inventory:${productId}`;
            const inventory = await this.getInventory(productId);

            if (!inventory || inventory.available < quantity) {
                return false;
            }

            // Update inventory with reservation
            const updatedInventory: InventoryData = {
                ...inventory,
                reserved: inventory.reserved + quantity,
                available: inventory.available - quantity,
                lastUpdated: Date.now()
            };

            await this.updateInventory(productId, updatedInventory);

            logger.debug(`Reserved ${quantity} units of product ${productId}`);
            return true;
        } catch (error) {
            logger.error(`Error reserving inventory for product ${productId}:`, error);
            return false;
        }
    }

    /**
     * Release reserved inventory
     */
    async releaseReservation(productId: string, quantity: number): Promise<boolean> {
        try {
            const inventory = await this.getInventory(productId);

            if (!inventory || inventory.reserved < quantity) {
                return false;
            }

            // Update inventory by releasing reservation
            const updatedInventory: InventoryData = {
                ...inventory,
                reserved: inventory.reserved - quantity,
                available: inventory.available + quantity,
                lastUpdated: Date.now()
            };

            await this.updateInventory(productId, updatedInventory);

            logger.debug(`Released ${quantity} reserved units of product ${productId}`);
            return true;
        } catch (error) {
            logger.error(`Error releasing reservation for product ${productId}:`, error);
            return false;
        }
    }

    /**
     * Get low stock products
     */
    async getLowStockProducts(): Promise<string[]> {
        try {
            const lowStockKey = `inventory:low-stock`;
            return await this.redis.smembers(lowStockKey);
        } catch (error) {
            logger.error('Error getting low stock products:', error);
            return [];
        }
    }

    /**
     * Get out of stock products
     */
    async getOutOfStockProducts(): Promise<string[]> {
        try {
            const outOfStockKey = `inventory:out-of-stock`;
            return await this.redis.smembers(outOfStockKey);
        } catch (error) {
            logger.error('Error getting out of stock products:', error);
            return [];
        }
    }

    /**
     * Batch update inventories
     */
    async batchUpdateInventories(inventories: Array<{ productId: string; inventory: InventoryData }>): Promise<void> {
        try {
            const pipeline = this.redis.getClient().pipeline();

            for (const { productId, inventory } of inventories) {
                const inventoryKey = `realtime:inventory:${productId}`;
                pipeline.setex(inventoryKey, this.inventoryTTL, JSON.stringify(inventory));
            }

            await pipeline.exec();

            // Emit batch update event
            this.emit('inventory.batch.updated', { inventories });

            logger.debug(`Batch updated ${inventories.length} inventories`);
        } catch (error) {
            logger.error('Error batch updating inventories:', error);
        }
    }

    /**
     * Get real-time statistics
     */
    async getRealtimeStats(): Promise<{
        activeDrivers: number;
        availableDrivers: number;
        busyDrivers: number;
        lowStockProducts: number;
        outOfStockProducts: number;
    }> {
        try {
            const [
                availableDrivers,
                busyDrivers,
                lowStockProducts,
                outOfStockProducts
            ] = await Promise.all([
                this.redis.getClient().scard('drivers:available'),
                this.redis.getClient().scard('drivers:busy'),
                this.redis.getClient().scard('inventory:low-stock'),
                this.redis.getClient().scard('inventory:out-of-stock')
            ]);

            return {
                activeDrivers: availableDrivers + busyDrivers,
                availableDrivers,
                busyDrivers,
                lowStockProducts,
                outOfStockProducts
            };
        } catch (error) {
            logger.error('Error getting real-time stats:', error);
            return {
                activeDrivers: 0,
                availableDrivers: 0,
                busyDrivers: 0,
                lowStockProducts: 0,
                outOfStockProducts: 0
            };
        }
    }

    /**
     * Clean up expired data
     */
    async cleanupExpiredData(): Promise<void> {
        try {
            const patterns = [
                'realtime:driver:*:location',
                'realtime:driver:*:status',
                'realtime:inventory:*'
            ];

            for (const pattern of patterns) {
                const keys = await this.redis.getClient().keys(pattern);

                for (const key of keys) {
                    const ttl = await this.redis.ttl(key);
                    if (ttl === -1) {
                        // Key exists but has no expiration, set appropriate TTL
                        if (key.includes(':location')) {
                            await this.redis.expire(key, this.locationTTL);
                        } else if (key.includes(':status')) {
                            await this.redis.expire(key, this.statusTTL);
                        } else if (key.includes('inventory:')) {
                            await this.redis.expire(key, this.inventoryTTL);
                        }
                    }
                }
            }

            logger.debug('Cleaned up expired real-time data');
        } catch (error) {
            logger.error('Error cleaning up expired data:', error);
        }
    }
}

// Export singleton instance
export const realtimeCache = new RealtimeCacheManager();