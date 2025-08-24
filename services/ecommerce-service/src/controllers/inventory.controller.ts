import { Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Inventory management controller
 */
export class InventoryController {
    private static inventoryService = new InventoryService();

    /**
     * Get inventory for product or variant
     */
    public static getInventory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { productId, variantId } = req.query;
        const inventory = await this.inventoryService.getInventory(
            productId as string,
            variantId as string
        );

        res.json({
            success: true,
            data: inventory
        });
    });

    /**
     * Get stock level
     */
    public static getStockLevel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { productId, variantId } = req.query;
        const stockLevel = await this.inventoryService.getStockLevel(
            productId as string,
            variantId as string
        );

        res.json({
            success: true,
            data: stockLevel
        });
    });

    /**
     * Get bulk stock levels
     */
    public static getBulkStockLevels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { items } = req.body;
        const stockLevels = await this.inventoryService.getBulkStockLevels(items);

        res.json({
            success: true,
            data: stockLevels
        });
    });

    /**
     * Adjust inventory (admin/vendor only)
     */
    public static adjustInventory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // Check permissions
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to adjust inventory'
            });
            return;
        }

        const { productId, variantId } = req.query;
        const inventory = await this.inventoryService.adjustInventory(
            productId as string,
            variantId as string,
            req.body
        );

        res.json({
            success: true,
            data: inventory,
            message: 'Inventory adjusted successfully'
        });
    });

    /**
     * Get low stock items (admin/vendor only)
     */
    public static getLowStockItems = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // Check permissions
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to view inventory alerts'
            });
            return;
        }

        const lowStockItems = await this.inventoryService.getLowStockItems();

        res.json({
            success: true,
            data: lowStockItems
        });
    });

    /**
     * Get inventory alerts (admin/vendor only)
     */
    public static getInventoryAlerts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // Check permissions
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to view inventory alerts'
            });
            return;
        }

        const alerts = await this.inventoryService.getInventoryAlerts();

        res.json({
            success: true,
            data: alerts
        });
    });

    /**
     * Update low stock threshold (admin/vendor only)
     */
    public static updateLowStockThreshold = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // Check permissions
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to update inventory settings'
            });
            return;
        }

        const { productId, variantId } = req.query;
        const { threshold } = req.body;

        const inventory = await this.inventoryService.updateLowStockThreshold(
            productId as string,
            variantId as string,
            threshold
        );

        res.json({
            success: true,
            data: inventory,
            message: 'Low stock threshold updated successfully'
        });
    });

    /**
     * Bulk inventory update (admin only)
     */
    public static bulkInventoryUpdate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // Check permissions
        if (!req.user!.roles.includes('admin')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to perform bulk inventory updates'
            });
            return;
        }

        const { updates } = req.body;
        await this.inventoryService.bulkInventoryUpdate(updates);

        res.json({
            success: true,
            message: 'Bulk inventory update completed successfully'
        });
    });

    /**
     * Get inventory movements
     */
    public static getInventoryMovements = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // Check permissions
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to view inventory movements'
            });
            return;
        }

        const { productId, variantId, limit } = req.query;
        const movements = await this.inventoryService.getInventoryMovements(
            productId as string,
            variantId as string,
            limit ? parseInt(limit as string) : undefined
        );

        res.json({
            success: true,
            data: movements
        });
    });

    /**
     * Validate cart stock
     */
    public static validateCartStock = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { items } = req.body;
        const validation = await this.inventoryService.validateCartStock(items);

        res.json({
            success: true,
            data: validation
        });
    });
}