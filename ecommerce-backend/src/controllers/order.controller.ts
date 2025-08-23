import { Response } from 'express';
import { OrderService } from '../services/order.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Order controller
 */
export class OrderController {
    /**
     * Create order
     */
    public static createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const order = await OrderService.createOrder(req.body, userId);

        res.status(201).json({
            success: true,
            data: order,
            message: 'Order created successfully'
        });
    });

    /**
     * Get order by ID
     */
    public static getOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const order = await OrderService.getOrderById(id);

        // Check if user owns the order or is admin
        if (order.userId !== req.user!.id && !req.user!.roles.includes('admin')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to view this order'
            });
            return;
        }

        res.json({
            success: true,
            data: order
        });
    });

    /**
     * Update order
     */
    public static updateOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;

        // Only admins and vendors can update orders
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to update orders'
            });
            return;
        }

        const order = await OrderService.updateOrder(id, req.body);

        res.json({
            success: true,
            data: order,
            message: 'Order updated successfully'
        });
    });

    /**
     * Get user orders
     */
    public static getUserOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const query = { ...req.query, userId } as any;
        const result = await OrderService.searchOrders(query);

        res.json({
            success: true,
            data: result.orders,
            pagination: result.pagination
        });
    });

    /**
     * Search orders (admin only)
     */
    public static searchOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const result = await OrderService.searchOrders(req.query as any);

        res.json({
            success: true,
            data: result.orders,
            pagination: result.pagination
        });
    });

    /**
     * Get order summary
     */
    public static getOrderSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.roles.includes('admin') ? undefined : req.user!.id;
        const summary = await OrderService.getOrderSummary(userId);

        res.json({
            success: true,
            data: summary
        });
    });

    /**
     * Add tracking information to order
     */
    public static addTrackingInfo = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;

        // Only admins and vendors can add tracking info
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to add tracking information'
            });
            return;
        }

        const order = await OrderService.addTrackingInfo(id, req.body);

        res.json({
            success: true,
            data: order,
            message: 'Tracking information added successfully'
        });
    });

    /**
     * Update order status
     */
    public static updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;

        // Only admins and vendors can update order status
        if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to update order status'
            });
            return;
        }

        const order = await OrderService.updateOrderStatus(id, req.body);

        res.json({
            success: true,
            data: order,
            message: 'Order status updated successfully'
        });
    });

    /**
     * Get order tracking history
     */
    public static getOrderTrackingHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;

        // Check if user owns the order or is admin/vendor
        const order = await OrderService.getOrderById(id);
        if (order.userId !== req.user!.id && !req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to view order tracking history'
            });
            return;
        }

        const history = await OrderService.getOrderTrackingHistory(id);

        res.json({
            success: true,
            data: history
        });
    });

    /**
     * Track order by tracking number
     */
    public static trackOrderByNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { trackingNumber } = req.params;
        const order = await OrderService.getOrderByTrackingNumber(trackingNumber);

        if (!order) {
            res.status(404).json({
                success: false,
                error: 'Order not found with this tracking number'
            });
            return;
        }

        // Check if user owns the order or is admin/vendor
        if (order.userId !== req.user!.id && !req.user!.roles.includes('admin') && !req.user!.roles.includes('vendor')) {
            res.status(403).json({
                success: false,
                error: 'Not authorized to view this order'
            });
            return;
        }

        const history = await OrderService.getOrderTrackingHistory(order.id);

        res.json({
            success: true,
            data: {
                order,
                trackingHistory: history
            }
        });
    });

    /**
     * Public order tracking (no authentication required)
     */
    public static publicTrackOrder = asyncHandler(async (req: any, res: Response) => {
        const { trackingNumber } = req.params;
        const { email } = req.query;

        if (!email) {
            res.status(400).json({
                success: false,
                error: 'Email is required for public order tracking'
            });
            return;
        }

        const order = await OrderService.getOrderByTrackingNumber(trackingNumber);

        if (!order) {
            res.status(404).json({
                success: false,
                error: 'Order not found with this tracking number'
            });
            return;
        }

        // Verify email matches order (would need to add email to order or get from user service)
        // For now, just return the tracking history
        const history = await OrderService.getOrderTrackingHistory(order.id);

        res.json({
            success: true,
            data: {
                orderNumber: order.orderNumber,
                status: order.status,
                trackingNumber: order.trackingNumber,
                trackingHistory: history
            }
        });
    });
}