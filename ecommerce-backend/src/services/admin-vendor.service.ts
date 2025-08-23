import { EcommerceDatabase } from '../database/connection';
import {
    Vendor,
    ProductApproval,
    VendorPayout,
    ApproveProductRequest,
    RejectProductRequest,
    RequestChangesRequest
} from '../types';

export class AdminVendorService {
    /**
     * Approve vendor registration
     */
    public static async approveVendor(vendorId: string, adminId: string): Promise<Vendor> {
        const client = EcommerceDatabase.getPool();

        const result = await client.query(`
            UPDATE vendors 
            SET status = 'approved', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `, [vendorId]);

        if (result.rows.length === 0) {
            throw new Error('Vendor not found or not in pending status');
        }

        // Create notification for vendor
        await this.createVendorNotification(
            vendorId,
            'vendor_approved',
            'Vendor Application Approved',
            'Congratulations! Your vendor application has been approved. You can now start listing products.',
            { approvedBy: adminId }
        );

        return this.mapVendorFromDb(result.rows[0]);
    }

    /**
     * Reject vendor registration
     */
    public static async rejectVendor(vendorId: string, adminId: string, reason: string): Promise<Vendor> {
        const client = EcommerceDatabase.getPool();

        const result = await client.query(`
            UPDATE vendors 
            SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `, [vendorId]);

        if (result.rows.length === 0) {
            throw new Error('Vendor not found or not in pending status');
        }

        // Create notification for vendor
        await this.createVendorNotification(
            vendorId,
            'vendor_rejected',
            'Vendor Application Rejected',
            `Your vendor application has been rejected. Reason: ${reason}`,
            { rejectedBy: adminId, reason }
        );

        return this.mapVendorFromDb(result.rows[0]);
    }

    /**
     * Suspend vendor
     */
    public static async suspendVendor(vendorId: string, adminId: string, reason: string): Promise<Vendor> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Suspend vendor
            const vendorResult = await client.query(`
                UPDATE vendors 
                SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [vendorId]);

            if (vendorResult.rows.length === 0) {
                throw new Error('Vendor not found');
            }

            // Deactivate all vendor products
            await client.query(`
                UPDATE products 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE vendor_id = $1
            `, [vendorId]);

            await client.query('COMMIT');

            // Create notification for vendor
            await this.createVendorNotification(
                vendorId,
                'vendor_suspended',
                'Account Suspended',
                `Your vendor account has been suspended. Reason: ${reason}`,
                { suspendedBy: adminId, reason }
            );

            return this.mapVendorFromDb(vendorResult.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Reactivate suspended vendor
     */
    public static async reactivateVendor(vendorId: string, adminId: string): Promise<Vendor> {
        const client = EcommerceDatabase.getPool();

        const result = await client.query(`
            UPDATE vendors 
            SET status = 'approved', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'suspended'
            RETURNING *
        `, [vendorId]);

        if (result.rows.length === 0) {
            throw new Error('Vendor not found or not suspended');
        }

        // Create notification for vendor
        await this.createVendorNotification(
            vendorId,
            'vendor_reactivated',
            'Account Reactivated',
            'Your vendor account has been reactivated. You can now resume your business activities.',
            { reactivatedBy: adminId }
        );

        return this.mapVendorFromDb(result.rows[0]);
    }

    /**
     * Get pending product approvals
     */
    public static async getPendingProductApprovals(
        limit: number = 20,
        offset: number = 0
    ): Promise<{ approvals: ProductApproval[]; total: number }> {
        const client = EcommerceDatabase.getPool();

        const countResult = await client.query(
            'SELECT COUNT(*) FROM product_approvals WHERE status = $1',
            ['pending']
        );

        const approvalsResult = await client.query(`
            SELECT pa.*, p.name as product_name, v.business_name as vendor_name
            FROM product_approvals pa
            JOIN products p ON pa.product_id = p.id
            JOIN vendors v ON pa.vendor_id = v.id
            WHERE pa.status = $1
            ORDER BY pa.submitted_at ASC
            LIMIT $2 OFFSET $3
        `, ['pending', limit, offset]);

        return {
            approvals: approvalsResult.rows.map((row: any) => ({
                ...this.mapProductApprovalFromDb(row),
                productName: row.product_name,
                vendorName: row.vendor_name
            })),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Approve product
     */
    public static async approveProduct(
        approvalId: string,
        adminId: string,
        approvalData: ApproveProductRequest
    ): Promise<ProductApproval> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Update approval status
            const approvalResult = await client.query(`
                UPDATE product_approvals 
                SET status = 'approved', 
                    reviewed_at = CURRENT_TIMESTAMP,
                    reviewed_by = $1,
                    admin_notes = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND status = 'pending'
                RETURNING *
            `, [adminId, approvalData.adminNotes || null, approvalId]);

            if (approvalResult.rows.length === 0) {
                throw new Error('Product approval not found or not in pending status');
            }

            const approval = approvalResult.rows[0];

            // Activate the product
            await client.query(`
                UPDATE products 
                SET is_active = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [approval.product_id]);

            await client.query('COMMIT');

            // Create notification for vendor
            await this.createVendorNotification(
                approval.vendor_id,
                'product_approved',
                'Product Approved',
                'Your product has been approved and is now live on the platform.',
                {
                    productId: approval.product_id,
                    approvedBy: adminId,
                    adminNotes: approvalData.adminNotes
                }
            );

            return this.mapProductApprovalFromDb(approval);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Reject product
     */
    public static async rejectProduct(
        approvalId: string,
        adminId: string,
        rejectionData: RejectProductRequest
    ): Promise<ProductApproval> {
        const client = EcommerceDatabase.getPool();

        const result = await client.query(`
            UPDATE product_approvals 
            SET status = 'rejected',
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = $1,
                rejection_reason = $2,
                admin_notes = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND status = 'pending'
            RETURNING *
        `, [adminId, rejectionData.rejectionReason, rejectionData.adminNotes || null, approvalId]);

        if (result.rows.length === 0) {
            throw new Error('Product approval not found or not in pending status');
        }

        const approval = result.rows[0];

        // Create notification for vendor
        await this.createVendorNotification(
            approval.vendor_id,
            'product_rejected',
            'Product Rejected',
            `Your product has been rejected. Reason: ${rejectionData.rejectionReason}`,
            {
                productId: approval.product_id,
                rejectedBy: adminId,
                rejectionReason: rejectionData.rejectionReason,
                adminNotes: rejectionData.adminNotes
            }
        );

        return this.mapProductApprovalFromDb(approval);
    }

    /**
     * Request changes to product
     */
    public static async requestProductChanges(
        approvalId: string,
        adminId: string,
        changesData: RequestChangesRequest
    ): Promise<ProductApproval> {
        const client = EcommerceDatabase.getPool();

        const result = await client.query(`
            UPDATE product_approvals 
            SET status = 'changes_requested',
                reviewed_at = CURRENT_TIMESTAMP,
                reviewed_by = $1,
                changes_requested = $2,
                admin_notes = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND status = 'pending'
            RETURNING *
        `, [adminId, changesData.changesRequested, changesData.adminNotes || null, approvalId]);

        if (result.rows.length === 0) {
            throw new Error('Product approval not found or not in pending status');
        }

        const approval = result.rows[0];

        // Create notification for vendor
        await this.createVendorNotification(
            approval.vendor_id,
            'product_changes_requested',
            'Product Changes Requested',
            `Changes have been requested for your product. Please review and resubmit.`,
            {
                productId: approval.product_id,
                reviewedBy: adminId,
                changesRequested: changesData.changesRequested,
                adminNotes: changesData.adminNotes
            }
        );

        return this.mapProductApprovalFromDb(approval);
    }

    /**
     * Update vendor commission rate
     */
    public static async updateVendorCommission(
        vendorId: string,
        commissionRate: number,
        adminId: string
    ): Promise<Vendor> {
        const client = EcommerceDatabase.getPool();

        if (commissionRate < 0 || commissionRate > 1) {
            throw new Error('Commission rate must be between 0 and 1');
        }

        const result = await client.query(`
            UPDATE vendors 
            SET commission_rate = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [commissionRate, vendorId]);

        if (result.rows.length === 0) {
            throw new Error('Vendor not found');
        }

        // Create notification for vendor
        await this.createVendorNotification(
            vendorId,
            'commission_updated',
            'Commission Rate Updated',
            `Your commission rate has been updated to ${(commissionRate * 100).toFixed(2)}%.`,
            {
                newCommissionRate: commissionRate,
                updatedBy: adminId
            }
        );

        return this.mapVendorFromDb(result.rows[0]);
    }

    /**
     * Process vendor payout
     */
    public static async processVendorPayout(
        vendorId: string,
        startDate: Date,
        endDate: Date,
        adminId: string
    ): Promise<VendorPayout> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Get vendor commission rate
            const vendorResult = await client.query(
                'SELECT commission_rate FROM vendors WHERE id = $1',
                [vendorId]
            );

            if (vendorResult.rows.length === 0) {
                throw new Error('Vendor not found');
            }

            const commissionRate = parseFloat(vendorResult.rows[0].commission_rate);

            // Calculate payout amounts
            const salesResult = await client.query(`
                SELECT 
                    COALESCE(SUM(oi.total_price), 0) as gross_sales,
                    COUNT(DISTINCT o.id) as total_orders,
                    ARRAY_AGG(DISTINCT o.id) as order_ids
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.vendor_id = $1 
                    AND o.created_at >= $2 
                    AND o.created_at <= $3
                    AND o.status = 'completed'
                    AND o.payment_status = 'paid'
            `, [vendorId, startDate, endDate]);

            const salesData = salesResult.rows[0];
            const grossSales = parseFloat(salesData.gross_sales);
            const commissionAmount = grossSales * commissionRate;
            const netAmount = grossSales - commissionAmount;
            const totalOrders = parseInt(salesData.total_orders);
            const orderIds = salesData.order_ids || [];

            // Create payout record
            const payoutResult = await client.query(`
                INSERT INTO vendor_payouts (
                    vendor_id, payout_period_start, payout_period_end,
                    gross_sales, commission_amount, net_amount,
                    total_orders, order_ids, processed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                vendorId, startDate, endDate,
                grossSales, commissionAmount, netAmount,
                totalOrders, orderIds, adminId
            ]);

            await client.query('COMMIT');

            const payout = payoutResult.rows[0];

            // Create notification for vendor
            await this.createVendorNotification(
                vendorId,
                'payout_processed',
                'Payout Processed',
                `Your payout of $${netAmount.toFixed(2)} has been processed for the period ${startDate.toDateString()} to ${endDate.toDateString()}.`,
                {
                    payoutId: payout.id,
                    netAmount,
                    grossSales,
                    commissionAmount,
                    processedBy: adminId
                }
            );

            return this.mapPayoutFromDb(payout);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Create vendor notification
     */
    private static async createVendorNotification(
        vendorId: string,
        type: string,
        title: string,
        message: string,
        data: Record<string, any> = {}
    ): Promise<void> {
        const client = EcommerceDatabase.getPool();

        await client.query(`
            INSERT INTO vendor_notifications (vendor_id, type, title, message, data)
            VALUES ($1, $2, $3, $4, $5)
        `, [vendorId, type, title, message, JSON.stringify(data)]);
    }

    // Helper methods
    private static mapVendorFromDb(row: any): Vendor {
        return {
            id: row.id,
            userId: row.user_id,
            businessName: row.business_name,
            businessType: row.business_type,
            businessRegistrationNumber: row.business_registration_number,
            taxId: row.tax_id,
            contactPerson: row.contact_person,
            phone: row.phone,
            email: row.email,
            website: row.website,
            businessAddress: row.business_address,
            bankAccountInfo: row.bank_account_info,
            status: row.status,
            verificationStatus: row.verification_status,
            verificationDocuments: row.verification_documents || [],
            totalSales: parseFloat(row.total_sales),
            totalOrders: row.total_orders,
            averageRating: parseFloat(row.average_rating),
            totalReviews: row.total_reviews,
            commissionRate: parseFloat(row.commission_rate),
            settings: row.settings || {},
            approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private static mapProductApprovalFromDb(row: any): ProductApproval {
        return {
            id: row.id,
            productId: row.product_id,
            vendorId: row.vendor_id,
            status: row.status,
            submittedAt: new Date(row.submitted_at),
            reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
            reviewedBy: row.reviewed_by,
            rejectionReason: row.rejection_reason,
            adminNotes: row.admin_notes,
            changesRequested: row.changes_requested,
            productData: row.product_data,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private static mapPayoutFromDb(row: any): VendorPayout {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            payoutPeriodStart: new Date(row.payout_period_start),
            payoutPeriodEnd: new Date(row.payout_period_end),
            grossSales: parseFloat(row.gross_sales),
            commissionAmount: parseFloat(row.commission_amount),
            netAmount: parseFloat(row.net_amount),
            totalOrders: row.total_orders,
            orderIds: row.order_ids || [],
            status: row.status,
            paymentMethod: row.payment_method,
            paymentReference: row.payment_reference,
            paymentDate: row.payment_date ? new Date(row.payment_date) : undefined,
            notes: row.notes,
            processedBy: row.processed_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}