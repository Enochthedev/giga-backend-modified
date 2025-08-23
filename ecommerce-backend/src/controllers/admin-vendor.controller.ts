import { Response } from 'express';
import { AdminVendorService } from '../services/admin-vendor.service';
import { VendorService } from '../services/vendor.service';
import {
    VendorSearchQuerySchema,
    ApproveProductSchema,
    RejectProductSchema,
    RequestChangesSchema,
    UpdateCommissionSchema,
    ProcessPayoutSchema,
    VendorActionSchema,
    PaginationQuerySchema
} from '../validation/vendor.validation';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AdminVendorController {
    /**
     * Search vendors (admin only)
     */
    public static async searchVendors(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const searchQuery = VendorSearchQuerySchema.parse(req.query);
            const result = await VendorService.searchVendors(searchQuery);

            res.json({
                success: true,
                data: result.vendors,
                pagination: result.pagination
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
                message: error.message || 'Failed to search vendors'
            });
        }
    }

    /**
     * Get vendor by ID (admin only)
     */
    public static async getVendorById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { vendorId } = req.params;
            const vendor = await VendorService.getVendorById(vendorId);

            if (!vendor) {
                res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
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
                message: error.message || 'Failed to get vendor'
            });
        }
    }

    /**
     * Approve vendor registration
     */
    public static async approveVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { vendorId } = req.params;
            const adminId = req.user!.id;

            const vendor = await AdminVendorService.approveVendor(vendorId, adminId);

            res.json({
                success: true,
                message: 'Vendor approved successfully',
                data: vendor
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to approve vendor'
            });
        }
    }

    /**
     * Reject vendor registration
     */
    public static async rejectVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { vendorId } = req.params;
            const { reason } = VendorActionSchema.parse(req.body);
            const adminId = req.user!.id;

            if (!reason) {
                res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required'
                });
                return;
            }

            const vendor = await AdminVendorService.rejectVendor(vendorId, adminId, reason);

            res.json({
                success: true,
                message: 'Vendor rejected successfully',
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
                message: error.message || 'Failed to reject vendor'
            });
        }
    }

    /**
     * Suspend vendor
     */
    public static async suspendVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { vendorId } = req.params;
            const { reason } = VendorActionSchema.parse(req.body);
            const adminId = req.user!.id;

            if (!reason) {
                res.status(400).json({
                    success: false,
                    message: 'Suspension reason is required'
                });
                return;
            }

            const vendor = await AdminVendorService.suspendVendor(vendorId, adminId, reason);

            res.json({
                success: true,
                message: 'Vendor suspended successfully',
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
                message: error.message || 'Failed to suspend vendor'
            });
        }
    }

    /**
     * Reactivate suspended vendor
     */
    public static async reactivateVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { vendorId } = req.params;
            const adminId = req.user!.id;

            const vendor = await AdminVendorService.reactivateVendor(vendorId, adminId);

            res.json({
                success: true,
                message: 'Vendor reactivated successfully',
                data: vendor
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to reactivate vendor'
            });
        }
    }

    /**
     * Get pending product approvals
     */
    public static async getPendingProductApprovals(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { page, limit } = PaginationQuerySchema.parse(req.query);
            const offset = (page - 1) * limit;

            const result = await AdminVendorService.getPendingProductApprovals(limit, offset);

            res.json({
                success: true,
                data: result.approvals,
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
                message: error.message || 'Failed to get pending product approvals'
            });
        }
    }

    /**
     * Approve product
     */
    public static async approveProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { approvalId } = req.params;
            const approvalData = ApproveProductSchema.parse(req.body);
            const adminId = req.user!.id;

            const approval = await AdminVendorService.approveProduct(approvalId, adminId, approvalData);

            res.json({
                success: true,
                message: 'Product approved successfully',
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
                message: error.message || 'Failed to approve product'
            });
        }
    }

    /**
     * Reject product
     */
    public static async rejectProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { approvalId } = req.params;
            const rejectionData = RejectProductSchema.parse(req.body);
            const adminId = req.user!.id;

            const approval = await AdminVendorService.rejectProduct(approvalId, adminId, rejectionData);

            res.json({
                success: true,
                message: 'Product rejected successfully',
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
                message: error.message || 'Failed to reject product'
            });
        }
    }

    /**
     * Request changes to product
     */
    public static async requestProductChanges(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { approvalId } = req.params;
            const changesData = RequestChangesSchema.parse(req.body);
            const adminId = req.user!.id;

            const approval = await AdminVendorService.requestProductChanges(approvalId, adminId, changesData);

            res.json({
                success: true,
                message: 'Changes requested successfully',
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
                message: error.message || 'Failed to request product changes'
            });
        }
    }

    /**
     * Update vendor commission rate
     */
    public static async updateVendorCommission(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { vendorId } = req.params;
            const { commissionRate } = UpdateCommissionSchema.parse(req.body);
            const adminId = req.user!.id;

            const vendor = await AdminVendorService.updateVendorCommission(vendorId, commissionRate, adminId);

            res.json({
                success: true,
                message: 'Commission rate updated successfully',
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
                message: error.message || 'Failed to update commission rate'
            });
        }
    }

    /**
     * Process vendor payout
     */
    public static async processVendorPayout(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { vendorId } = req.params;
            const { startDate, endDate } = ProcessPayoutSchema.parse(req.body);
            const adminId = req.user!.id;

            const payout = await AdminVendorService.processVendorPayout(vendorId, startDate, endDate, adminId);

            res.json({
                success: true,
                message: 'Payout processed successfully',
                data: payout
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
                message: error.message || 'Failed to process payout'
            });
        }
    }
}