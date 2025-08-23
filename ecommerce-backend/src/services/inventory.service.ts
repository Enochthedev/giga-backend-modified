import { EcommerceDatabase } from '../database/connection';
import {
    Inventory,
    InventoryAdjustment,
    StockLevel,
    InventoryMovement
} from '../types';
import { AppError } from '../middleware/error.middleware';

/**
 * Inventory management service
 */
export class InventoryService {
    /**
     * Create inventory record
     */
    public async createInventory(data: {
        productId?: string;
        variantId?: string;
        quantity: number;
        lowStockThreshold?: number;
        location?: string;
        notes?: string;
    }): Promise<Inventory> {
        const { productId, variantId, quantity, lowStockThreshold = 5, location, notes } = data;

        if (!productId && !variantId) {
            throw new AppError('Either productId or variantId is required', 400);
        }

        // Check if inventory already exists
        const existingResult = await EcommerceDatabase.query(`
            SELECT id FROM inventory 
            WHERE (product_id = $1 OR product_id IS NULL) 
            AND (variant_id = $2 OR variant_id IS NULL)
        `, [productId || null, variantId || null]);

        if (existingResult.rows.length > 0) {
            throw new AppError('Inventory record already exists', 409);
        }

        const result = await EcommerceDatabase.query(`
            INSERT INTO inventory (product_id, variant_id, quantity, low_stock_threshold, location, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [productId || null, variantId || null, quantity, lowStockThreshold, location, notes]);

        const inventory = result.rows[0];

        // Record inventory movement
        await this.recordMovement({
            productId,
            variantId,
            type: 'in',
            quantity,
            previousQuantity: 0,
            newQuantity: quantity,
            reason: 'Initial inventory'
        });

        return {
            id: inventory.id,
            productId: inventory.product_id,
            variantId: inventory.variant_id,
            quantity: inventory.quantity,
            reservedQuantity: inventory.reserved_quantity,
            lowStockThreshold: inventory.low_stock_threshold,
            location: inventory.location,
            notes: inventory.notes,
            createdAt: inventory.created_at,
            updatedAt: inventory.updated_at
        };
    }

    /**
     * Get inventory by product or variant
     */
    public async getInventory(productId?: string, variantId?: string): Promise<Inventory | null> {
        if (!productId && !variantId) {
            throw new AppError('Either productId or variantId is required', 400);
        }

        const result = await EcommerceDatabase.query(`
            SELECT * FROM inventory 
            WHERE (product_id = $1 OR product_id IS NULL) 
            AND (variant_id = $2 OR variant_id IS NULL)
        `, [productId || null, variantId || null]);

        if (result.rows.length === 0) {
            return null;
        }

        const inventory = result.rows[0];
        return {
            id: inventory.id,
            productId: inventory.product_id,
            variantId: inventory.variant_id,
            quantity: inventory.quantity,
            reservedQuantity: inventory.reserved_quantity,
            lowStockThreshold: inventory.low_stock_threshold,
            location: inventory.location,
            notes: inventory.notes,
            createdAt: inventory.created_at,
            updatedAt: inventory.updated_at
        };
    }

    /**
     * Get stock level
     */
    public async getStockLevel(productId?: string, variantId?: string): Promise<StockLevel> {
        const inventory = await this.getInventory(productId, variantId);

        if (!inventory) {
            return {
                productId,
                variantId,
                available: 0,
                reserved: 0,
                total: 0,
                isLowStock: true,
                isOutOfStock: true
            };
        }

        const available = Math.max(0, inventory.quantity - inventory.reservedQuantity);

        return {
            productId: inventory.productId,
            variantId: inventory.variantId,
            available,
            reserved: inventory.reservedQuantity,
            total: inventory.quantity,
            isLowStock: inventory.quantity <= inventory.lowStockThreshold,
            isOutOfStock: available === 0
        };
    }

    /**
     * Adjust inventory
     */
    public async adjustInventory(
        productId: string | undefined,
        variantId: string | undefined,
        adjustment: InventoryAdjustment
    ): Promise<Inventory> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            const inventory = await this.getInventory(productId, variantId);
            if (!inventory) {
                throw new AppError('Inventory record not found', 404);
            }

            let newQuantity: number;
            const previousQuantity = inventory.quantity;

            switch (adjustment.type) {
                case 'increase':
                    newQuantity = previousQuantity + adjustment.quantity;
                    break;
                case 'decrease':
                    newQuantity = Math.max(0, previousQuantity - adjustment.quantity);
                    break;
                case 'set':
                    newQuantity = adjustment.quantity;
                    break;
                default:
                    throw new AppError('Invalid adjustment type', 400);
            }

            // Update inventory
            const updateResult = await client.query(`
                UPDATE inventory 
                SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
                RETURNING *
            `, [newQuantity, inventory.id]);

            const updatedInventory = updateResult.rows[0];

            // Record movement
            await this.recordMovement({
                productId,
                variantId,
                type: adjustment.type === 'increase' ? 'in' : 'out',
                quantity: Math.abs(newQuantity - previousQuantity),
                previousQuantity,
                newQuantity,
                reason: adjustment.reason,
                notes: adjustment.notes
            });

            await client.query('COMMIT');

            return {
                id: updatedInventory.id,
                productId: updatedInventory.product_id,
                variantId: updatedInventory.variant_id,
                quantity: updatedInventory.quantity,
                reservedQuantity: updatedInventory.reserved_quantity,
                lowStockThreshold: updatedInventory.low_stock_threshold,
                location: updatedInventory.location,
                notes: updatedInventory.notes,
                createdAt: updatedInventory.created_at,
                updatedAt: updatedInventory.updated_at
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Reserve inventory for order
     */
    public async reserveInventory(
        productId: string | undefined,
        variantId: string | undefined,
        quantity: number,
        orderId?: string
    ): Promise<boolean> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            const inventory = await this.getInventory(productId, variantId);
            if (!inventory) {
                throw new AppError('Inventory record not found', 404);
            }

            const availableQuantity = inventory.quantity - inventory.reservedQuantity;

            if (availableQuantity < quantity) {
                await client.query('ROLLBACK');
                return false; // Insufficient stock
            }

            // Update reserved quantity
            await client.query(`
                UPDATE inventory 
                SET reserved_quantity = reserved_quantity + $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [quantity, inventory.id]);

            // Record movement
            await this.recordMovement({
                productId,
                variantId,
                type: 'reservation',
                quantity,
                previousQuantity: inventory.quantity,
                newQuantity: inventory.quantity,
                reason: 'Inventory reserved for order',
                reference: orderId
            });

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Release reserved inventory
     */
    public async releaseReservation(
        productId: string | undefined,
        variantId: string | undefined,
        quantity: number,
        orderId?: string
    ): Promise<void> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            const inventory = await this.getInventory(productId, variantId);
            if (!inventory) {
                throw new AppError('Inventory record not found', 404);
            }

            const newReservedQuantity = Math.max(0, inventory.reservedQuantity - quantity);

            // Update reserved quantity
            await client.query(`
                UPDATE inventory 
                SET reserved_quantity = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [newReservedQuantity, inventory.id]);

            // Record movement
            await this.recordMovement({
                productId,
                variantId,
                type: 'release',
                quantity,
                previousQuantity: inventory.quantity,
                newQuantity: inventory.quantity,
                reason: 'Reservation released',
                reference: orderId
            });

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Fulfill inventory (reduce actual quantity from reserved)
     */
    public async fulfillInventory(
        productId: string | undefined,
        variantId: string | undefined,
        quantity: number,
        orderId?: string
    ): Promise<void> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            const inventory = await this.getInventory(productId, variantId);
            if (!inventory) {
                throw new AppError('Inventory record not found', 404);
            }

            if (inventory.reservedQuantity < quantity) {
                throw new AppError('Cannot fulfill more than reserved quantity', 400);
            }

            const newQuantity = inventory.quantity - quantity;
            const newReservedQuantity = inventory.reservedQuantity - quantity;

            // Update both quantities
            await client.query(`
                UPDATE inventory 
                SET quantity = $1, reserved_quantity = $2, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $3
            `, [newQuantity, newReservedQuantity, inventory.id]);

            // Record movement
            await this.recordMovement({
                productId,
                variantId,
                type: 'out',
                quantity,
                previousQuantity: inventory.quantity,
                newQuantity,
                reason: 'Inventory fulfilled for order',
                reference: orderId
            });

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Get low stock items
     */
    public async getLowStockItems(): Promise<StockLevel[]> {
        const result = await EcommerceDatabase.query(`
            SELECT 
                i.*,
                p.name as product_name,
                pv.name as variant_name
            FROM inventory i
            LEFT JOIN products p ON i.product_id = p.id
            LEFT JOIN product_variants pv ON i.variant_id = pv.id
            WHERE i.quantity <= i.low_stock_threshold
            ORDER BY i.quantity ASC
        `);

        return result.rows.map((row: any) => {
            const available = Math.max(0, row.quantity - row.reserved_quantity);
            return {
                productId: row.product_id,
                variantId: row.variant_id,
                available,
                reserved: row.reserved_quantity,
                total: row.quantity,
                isLowStock: row.quantity <= row.low_stock_threshold,
                isOutOfStock: available === 0
            };
        });
    }

    /**
     * Record inventory movement
     */
    private async recordMovement(data: {
        productId?: string;
        variantId?: string;
        type: 'in' | 'out' | 'adjustment' | 'reservation' | 'release';
        quantity: number;
        previousQuantity: number;
        newQuantity: number;
        reason: string;
        reference?: string;
        notes?: string;
    }): Promise<void> {
        await EcommerceDatabase.query(`
            INSERT INTO inventory_movements (
                product_id, variant_id, type, quantity, previous_quantity, 
                new_quantity, reason, reference, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            data.productId || null,
            data.variantId || null,
            data.type,
            data.quantity,
            data.previousQuantity,
            data.newQuantity,
            data.reason,
            data.reference,
            data.notes
        ]);
    }

    /**
     * Get inventory movements
     */
    public async getInventoryMovements(
        productId?: string,
        variantId?: string,
        limit: number = 50
    ): Promise<InventoryMovement[]> {
        const result = await EcommerceDatabase.query(`
            SELECT * FROM inventory_movements
            WHERE (product_id = $1 OR $1 IS NULL)
            AND (variant_id = $2 OR $2 IS NULL)
            ORDER BY created_at DESC
            LIMIT $3
        `, [productId || null, variantId || null, limit]);

        return result.rows.map((row: any) => ({
            id: row.id,
            productId: row.product_id,
            variantId: row.variant_id,
            type: row.type,
            quantity: row.quantity,
            previousQuantity: row.previous_quantity,
            newQuantity: row.new_quantity,
            reason: row.reason,
            reference: row.reference,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    /**
     * Get real-time stock levels for multiple products/variants
     */
    public async getBulkStockLevels(items: Array<{
        productId?: string;
        variantId?: string;
    }>): Promise<StockLevel[]> {
        if (items.length === 0) {
            return [];
        }

        // Build query for multiple items
        const conditions = items.map((_, index) => {
            const productParam = `$${index * 2 + 1}`;
            const variantParam = `$${index * 2 + 2}`;
            return `(product_id = ${productParam} AND variant_id = ${variantParam})`;
        }).join(' OR ');

        const params = items.flatMap(item => [item.productId || null, item.variantId || null]);

        const result = await EcommerceDatabase.query(`
            SELECT * FROM inventory 
            WHERE ${conditions}
        `, params);

        const inventoryMap = new Map<string, any>();
        result.rows.forEach((row: any) => {
            const key = `${row.product_id || 'null'}-${row.variant_id || 'null'}`;
            inventoryMap.set(key, row);
        });

        return items.map(item => {
            const key = `${item.productId || 'null'}-${item.variantId || 'null'}`;
            const inventory = inventoryMap.get(key);

            if (!inventory) {
                return {
                    productId: item.productId,
                    variantId: item.variantId,
                    available: 0,
                    reserved: 0,
                    total: 0,
                    isLowStock: true,
                    isOutOfStock: true
                };
            }

            const available = Math.max(0, inventory.quantity - inventory.reserved_quantity);

            return {
                productId: inventory.product_id,
                variantId: inventory.variant_id,
                available,
                reserved: inventory.reserved_quantity,
                total: inventory.quantity,
                isLowStock: inventory.quantity <= inventory.low_stock_threshold,
                isOutOfStock: available === 0
            };
        });
    }

    /**
     * Update low stock threshold
     */
    public async updateLowStockThreshold(
        productId: string | undefined,
        variantId: string | undefined,
        threshold: number
    ): Promise<Inventory> {
        const inventory = await this.getInventory(productId, variantId);
        if (!inventory) {
            throw new AppError('Inventory record not found', 404);
        }

        const result = await EcommerceDatabase.query(`
            UPDATE inventory 
            SET low_stock_threshold = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `, [threshold, inventory.id]);

        const updatedInventory = result.rows[0];

        return {
            id: updatedInventory.id,
            productId: updatedInventory.product_id,
            variantId: updatedInventory.variant_id,
            quantity: updatedInventory.quantity,
            reservedQuantity: updatedInventory.reserved_quantity,
            lowStockThreshold: updatedInventory.low_stock_threshold,
            location: updatedInventory.location,
            notes: updatedInventory.notes,
            createdAt: updatedInventory.created_at,
            updatedAt: updatedInventory.updated_at
        };
    }

    /**
     * Get inventory alerts (low stock, out of stock)
     */
    public async getInventoryAlerts(): Promise<Array<{
        type: 'low_stock' | 'out_of_stock';
        productId?: string;
        variantId?: string;
        productName: string;
        variantName?: string;
        currentStock: number;
        threshold: number;
        reserved: number;
    }>> {
        const result = await EcommerceDatabase.query(`
            SELECT 
                i.*,
                p.name as product_name,
                pv.name as variant_name
            FROM inventory i
            LEFT JOIN products p ON i.product_id = p.id
            LEFT JOIN product_variants pv ON i.variant_id = pv.id
            WHERE i.quantity <= i.low_stock_threshold OR (i.quantity - i.reserved_quantity) <= 0
            ORDER BY i.quantity ASC
        `);

        return result.rows.map((row: any) => {
            const available = Math.max(0, row.quantity - row.reserved_quantity);
            const type = available === 0 ? 'out_of_stock' : 'low_stock';

            return {
                type,
                productId: row.product_id,
                variantId: row.variant_id,
                productName: row.product_name,
                variantName: row.variant_name,
                currentStock: row.quantity,
                threshold: row.low_stock_threshold,
                reserved: row.reserved_quantity
            };
        });
    }

    /**
     * Bulk inventory update for multiple items
     */
    public async bulkInventoryUpdate(updates: Array<{
        productId?: string;
        variantId?: string;
        quantity: number;
        reason: string;
    }>): Promise<void> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            for (const update of updates) {
                const inventory = await this.getInventory(update.productId, update.variantId);
                if (!inventory) {
                    // Create inventory if it doesn't exist
                    await this.createInventory({
                        productId: update.productId,
                        variantId: update.variantId,
                        quantity: update.quantity
                    });
                } else {
                    // Update existing inventory
                    await this.adjustInventory(update.productId, update.variantId, {
                        type: 'set',
                        quantity: update.quantity,
                        reason: update.reason
                    });
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Check if sufficient stock is available for cart items
     */
    public async validateCartStock(cartItems: Array<{
        productId?: string;
        variantId?: string;
        quantity: number;
    }>): Promise<{
        isValid: boolean;
        errors: Array<{
            productId?: string;
            variantId?: string;
            requested: number;
            available: number;
            message: string;
        }>;
    }> {
        const stockLevels = await this.getBulkStockLevels(cartItems);
        const errors: Array<{
            productId?: string;
            variantId?: string;
            requested: number;
            available: number;
            message: string;
        }> = [];

        cartItems.forEach((item, index) => {
            const stock = stockLevels[index];
            if (stock.available < item.quantity) {
                errors.push({
                    productId: item.productId,
                    variantId: item.variantId,
                    requested: item.quantity,
                    available: stock.available,
                    message: stock.available === 0
                        ? 'Product is out of stock'
                        : `Only ${stock.available} items available`
                });
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}