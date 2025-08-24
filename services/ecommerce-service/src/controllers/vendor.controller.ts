import { Response } from 'express';
import { VendorService } from '../services/vendor.service';
import {
    CreateVendorSchema,
    UpdateVendorSchema,
    ProductApprovalRequestSchema,
    SalesReportQuerySchema,
    NotificationQuerySchema
} from '../validation/vendor.validation';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class VendorController {
    /**
     * Register as a vendor
     */
    public static async registerVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validatedData = CreateVendorSchema.parse(req.body);
            const userId = req.user!.id;

            const vendor = await VendorService.createVendor(validatedData, userId);

            res.status(201).json({
                success: true,
                message: 'Vendor registration submitted successfully',
                data: vendor
            });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors
                });
                return;
            }

            res.status(400).json({
                success: false,
                message: error.message || 'Failed to register vendor'
            });
        }
    }

    /**
     * Get vendor profile
     */
    public static async getVendorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const vendor = await VendorService.getVendorByUserId(userId);

            if (!vendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor profile not found'
                });
                return;
            }

            res.json({
                success: true,
                data: vendor
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get vendor profile'
            });
        }
    }

    /**
     * Update vendor profile
     */
    public static async updateVendorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validatedData = UpdateVendorSchema.parse(req.body);
            const userId = req.user!.id;

            // Get vendor by user ID first
            const existingVendor = await VendorService.getVendorByUserId(userId);
            if (!existingVendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor profile not found'
                });
                return;
            }

            const vendor = await VendorService.updateVendor(existingVendor.id, validatedData);

            res.json({
                success: true,
                message: 'Vendor profile updated successfully',
                data: vendor
            });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors
                });
                return;
            }

            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update vendor profile'
            });
        }
    }

    /**
     * Get vendor dashboard statistics
     */
    public static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const vendor = await VendorService.getVendorByUserId(userId);

            if (!vendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor profile not found'
                });
                return;
            }

            const stats = await VendorService.getVendorDashboardStats(vendor.id);

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get dashboard statistics'
            });
        }
    }

    /**
     * Get vendor sales report
     */
    public static async getSalesReport(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = SalesReportQuerySchema.parse(req.query);
            const userId = req.user!.id;

            const vendor = await VendorService.getVendorByUserId(userId);
            if (!vendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor profile not found'
                });
                return;
            }

            const report = await VendorService.getVendorSalesReport(vendor.id, startDate, endDate);

            res.json({
                success: true,
                data: report
            });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get sales report'
            });
        }
    }

    /**
     * Submit product for approval
     */
    public static async submitProductForApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validatedData = ProductApprovalRequestSchema.parse(req.body);
            const userId = req.user!.id;

            const vendor = await VendorService.getVendorByUserId(userId);
            if (!vendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor profile not found'
                });
                return;
            }

            const approval = await VendorService.submitProductForApproval(vendor.id, validatedData);

            res.status(201).json({
                success: true,
                message: 'Product submitted for approval successfully',
                data: approval
            });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors
                });
                return;
            }

            res.status(400).json({
                success: false,
                message: error.message || 'Failed to submit product for approval'
            });
        }
    }

    /**
     * Get vendor notifications
     */
    public static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { page, limit } = NotificationQuerySchema.parse(req.query);
            const userId = req.user!.id;

            const vendor = await VendorService.getVendorByUserId(userId);
            if (!vendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor profile not found'
                });
                return;
            }

            const offset = (page - 1) * limit;
            const result = await VendorService.getVendorNotifications(vendor.id, limit, offset);

            res.json({
                success: true,
                data: result.notifications,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get notifications'
            });
        }
    }

    /**
     * Mark notification as read
     */
    public static async markNotificationAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { notificationId } = req.params;
            const userId = req.user!.id;

            const vendor = await VendorService.getVendorByUserId(userId);
            if (!vendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor profile not found'
                });
                return;
            }

            await VendorService.markNotificationAsRead(notificationId, vendor.id);

            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to mark notification as read'
            });
        }
    }
}