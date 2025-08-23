import { EcommerceDatabase } from '../database/connection';
import {
    Vendor,
    ProductApproval,
    VendorNotification,
    CreateVendorRequest,
    UpdateVendorRequest,
    VendorDashboardStats,
    VendorSalesReport,
    ProductApprovalRequest,
    VendorSearchQuery,
    PaginationInfo
} from '../types';

export class VendorService {
    /**
     * Register a new vendor
     */
    public static async createVendor(vendorData: CreateVendorRequest, userId: string): Promise<Vendor> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Check if user is already a vendor
            const existingVendor = await client.query(
                'SELECT id FROM vendors WHERE user_id = $1',
                [userId]
            );

            if (existingVendor.rows.length > 0) {
                throw new Error('User is already registered as a vendor');
            }

            // Create vendor record
            const vendorResult = await client.query(`
                INSERT INTO vendors (
                    user_id, business_name, business_type, business_registration_number,
                    tax_id, contact_person, phone, email, website, business_address,
                    bank_account_info
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                userId,
                vendorData.businessName,
                vendorData.businessType,
                vendorData.businessRegistrationNumber || null,
                vendorData.taxId || null,
                vendorData.contactPerson || null,
                vendorData.phone || null,
                vendorData.email || null,
                vendorData.website || null,
                JSON.stringify(vendorData.businessAddress),
                vendorData.bankAccountInfo ? JSON.stringify(vendorData.bankAccountInfo) : null
            ]);

            await client.query('COMMIT');

            const vendor = vendorResult.rows[0];
            return this.mapVendorFromDb(vendor);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Get vendor by user ID
     */
    public static async getVendorByUserId(userId: string): Promise<Vendor | null> {
        const client = EcommerceDatabase.getPool();

        const result = await client.query(
            'SELECT * FROM vendors WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapVendorFromDb(result.rows[0]);
    }

    /**
     * Get vendor by ID
     */
    public static async getVendorById(vendorId: string): Promise<Vendor | null> {
        const client = EcommerceDatabase.getPool();

        const result = await client.query(
            'SELECT * FROM vendors WHERE id = $1',
            [vendorId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapVendorFromDb(result.rows[0]);
    }

    /**
     * Update vendor information
     */
    public static async updateVendor(vendorId: string, updateData: UpdateVendorRequest): Promise<Vendor> {
        const client = EcommerceDatabase.getPool();

        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if (updateData.businessName !== undefined) {
            updateFields.push(`business_name = $${paramIndex++}`);
            updateValues.push(updateData.businessName);
        }

        if (updateData.businessType !== undefined) {
            updateFields.push(`business_type = $${paramIndex++}`);
            updateValues.push(updateData.businessType);
        }

        if (updateData.businessRegistrationNumber !== undefined) {
            updateFields.push(`business_registration_number = $${paramIndex++}`);
            updateValues.push(updateData.businessRegistrationNumber);
        }

        if (updateData.taxId !== undefined) {
            updateFields.push(`tax_id = $${paramIndex++}`);
            updateValues.push(updateData.taxId);
        }

        if (updateData.contactPerson !== undefined) {
            updateFields.push(`contact_person = $${paramIndex++}`);
            updateValues.push(updateData.contactPerson);
        }

        if (updateData.phone !== undefined) {
            updateFields.push(`phone = $${paramIndex++}`);
            updateValues.push(updateData.phone);
        }

        if (updateData.email !== undefined) {
            updateFields.push(`email = $${paramIndex++}`);
            updateValues.push(updateData.email);
        }

        if (updateData.website !== undefined) {
            updateFields.push(`website = $${paramIndex++}`);
            updateValues.push(updateData.website);
        }

        if (updateData.businessAddress !== undefined) {
            updateFields.push(`business_address = $${paramIndex++}`);
            updateValues.push(JSON.stringify(updateData.businessAddress));
        }

        if (updateData.bankAccountInfo !== undefined) {
            updateFields.push(`bank_account_info = $${paramIndex++}`);
            updateValues.push(JSON.stringify(updateData.bankAccountInfo));
        }

        if (updateData.settings !== undefined) {
            updateFields.push(`settings = $${paramIndex++}`);
            updateValues.push(JSON.stringify(updateData.settings));
        }

        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }

        updateValues.push(vendorId);

        const result = await client.query(`
            UPDATE vendors 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `, updateValues);

        if (result.rows.length === 0) {
            throw new Error('Vendor not found');
        }

        return this.mapVendorFromDb(result.rows[0]);
    }

    /**
     * Get vendor dashboard statistics
     */
    public static async getVendorDashboardStats(vendorId: string): Promise<VendorDashboardStats> {
        const client = EcommerceDatabase.getPool();

        // Get basic vendor stats
        const vendorResult = await client.query(`
            SELECT total_sales, total_orders, average_rating, total_reviews
            FROM vendors WHERE id = $1
        `, [vendorId]);

        if (vendorResult.rows.length === 0) {
            throw new Error('Vendor not found');
        }

        const vendor = vendorResult.rows[0];

        // Get product counts
        const productStats = await client.query(`
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_products
            FROM products WHERE vendor_id = $1
        `, [vendorId]);

        // Get pending product approvals
        const pendingApprovals = await client.query(`
            SELECT COUNT(*) as pending_products
            FROM product_approvals 
            WHERE vendor_id = $1 AND status = 'pending'
        `, [vendorId]);

        // Get pending payouts
        const pendingPayouts = await client.query(`
            SELECT COUNT(*) as pending_payouts
            FROM vendor_payouts 
            WHERE vendor_id = $1 AND status = 'pending'
        `, [vendorId]);

        // Get last payout amount
        const lastPayout = await client.query(`
            SELECT net_amount
            FROM vendor_payouts 
            WHERE vendor_id = $1 AND status = 'completed'
            ORDER BY payment_date DESC
            LIMIT 1
        `, [vendorId]);

        // Calculate growth (compare with previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const currentPeriodStats = await client.query(`
            SELECT 
                COALESCE(SUM(total_sales), 0) as sales,
                COALESCE(SUM(total_orders), 0) as orders
            FROM vendor_analytics 
            WHERE vendor_id = $1 AND date >= $2
        `, [vendorId, thirtyDaysAgo]);

        const previousPeriodStats = await client.query(`
            SELECT 
                COALESCE(SUM(total_sales), 0) as sales,
                COALESCE(SUM(total_orders), 0) as orders
            FROM vendor_analytics 
            WHERE vendor_id = $1 AND date >= $2 AND date < $3
        `, [vendorId, sixtyDaysAgo, thirtyDaysAgo]);

        const currentSales = parseFloat(currentPeriodStats.rows[0].sales);
        const previousSales = parseFloat(previousPeriodStats.rows[0].sales);
        const currentOrders = parseInt(currentPeriodStats.rows[0].orders);
        const previousOrders = parseInt(previousPeriodStats.rows[0].orders);

        const salesGrowth = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0;
        const ordersGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;

        return {
            totalSales: parseFloat(vendor.total_sales),
            totalOrders: vendor.total_orders,
            totalProducts: parseInt(productStats.rows[0].total_products),
            activeProducts: parseInt(productStats.rows[0].active_products),
            pendingProducts: parseInt(pendingApprovals.rows[0].pending_products),
            averageRating: parseFloat(vendor.average_rating),
            totalReviews: vendor.total_reviews,
            pendingPayouts: parseInt(pendingPayouts.rows[0].pending_payouts),
            lastPayoutAmount: lastPayout.rows.length > 0 ? parseFloat(lastPayout.rows[0].net_amount) : 0,
            salesGrowth,
            ordersGrowth
        };
    }

    /**
     * Get vendor sales report
     */
    public static async getVendorSalesReport(
        vendorId: string,
        startDate: Date,
        endDate: Date
    ): Promise<VendorSalesReport> {
        const client = EcommerceDatabase.getPool();

        // Get overall stats for the period
        const overallStats = await client.query(`
            SELECT 
                COALESCE(SUM(total_sales), 0) as total_sales,
                COALESCE(SUM(total_orders), 0) as total_orders,
                COALESCE(SUM(total_items_sold), 0) as total_items_sold
            FROM vendor_analytics 
            WHERE vendor_id = $1 AND date >= $2 AND date <= $3
        `, [vendorId, startDate, endDate]);

        const stats = overallStats.rows[0];
        const totalSales = parseFloat(stats.total_sales);
        const totalOrders = parseInt(stats.total_orders);
        const totalItemsSold = parseInt(stats.total_items_sold);
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        // Get top products
        const topProducts = await client.query(`
            SELECT 
                oi.product_id,
                oi.product_name,
                COUNT(*) as orders,
                SUM(oi.quantity) as sales,
                SUM(oi.total_price) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.vendor_id = $1 
                AND o.created_at >= $2 
                AND o.created_at <= $3
                AND o.status != 'cancelled'
            GROUP BY oi.product_id, oi.product_name
            ORDER BY revenue DESC
            LIMIT 10
        `, [vendorId, startDate, endDate]);

        // Get daily sales
        const dailySales = await client.query(`
            SELECT 
                date,
                total_sales as revenue,
                total_orders as orders,
                total_items_sold as sales
            FROM vendor_analytics 
            WHERE vendor_id = $1 AND date >= $2 AND date <= $3
            ORDER BY date ASC
        `, [vendorId, startDate, endDate]);

        return {
            period: { start: startDate, end: endDate },
            totalSales: totalItemsSold,
            totalOrders,
            totalItemsSold,
            averageOrderValue,
            topProducts: topProducts.rows.map((row: any) => ({
                productId: row.product_id,
                productName: row.product_name,
                sales: parseInt(row.sales),
                orders: parseInt(row.orders),
                revenue: parseFloat(row.revenue)
            })),
            dailySales: dailySales.rows.map((row: any) => ({
                date: new Date(row.date),
                sales: parseInt(row.sales),
                orders: parseInt(row.orders),
                revenue: parseFloat(row.revenue)
            }))
        };
    }

    /**
     * Submit product for approval
     */
    public static async submitProductForApproval(
        vendorId: string,
        approvalData: ProductApprovalRequest
    ): Promise<ProductApproval> {
        const client = EcommerceDatabase.getPool();

        // Verify product belongs to vendor
        const productCheck = await client.query(
            'SELECT id FROM products WHERE id = $1 AND vendor_id = $2',
            [approvalData.productId, vendorId]
        );

        if (productCheck.rows.length === 0) {
            throw new Error('Product not found or does not belong to vendor');
        }

        // Check if there's already a pending approval
        const existingApproval = await client.query(
            'SELECT id FROM product_approvals WHERE product_id = $1 AND status = $2',
            [approvalData.productId, 'pending']
        );

        if (existingApproval.rows.length > 0) {
            throw new Error('Product already has a pending approval request');
        }

        const result = await client.query(`
            INSERT INTO product_approvals (product_id, vendor_id, product_data)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [
            approvalData.productId,
            vendorId,
            JSON.stringify(approvalData.productData)
        ]);

        return this.mapProductApprovalFromDb(result.rows[0]);
    }

    /**
     * Get vendor notifications
     */
    public static async getVendorNotifications(
        vendorId: string,
        limit: number = 20,
        offset: number = 0
    ): Promise<{ notifications: VendorNotification[]; total: number }> {
        const client = EcommerceDatabase.getPool();

        const countResult = await client.query(
            'SELECT COUNT(*) FROM vendor_notifications WHERE vendor_id = $1',
            [vendorId]
        );

        const notificationsResult = await client.query(`
            SELECT * FROM vendor_notifications 
            WHERE vendor_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [vendorId, limit, offset]);

        return {
            notifications: notificationsResult.rows.map((row: any) => this.mapNotificationFromDb(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Mark notification as read
     */
    public static async markNotificationAsRead(notificationId: string, vendorId: string): Promise<void> {
        const client = EcommerceDatabase.getPool();

        await client.query(`
            UPDATE vendor_notifications 
            SET is_read = true 
            WHERE id = $1 AND vendor_id = $2
        `, [notificationId, vendorId]);
    }

    /**
     * Search vendors (admin function)
     */
    public static async searchVendors(searchQuery: VendorSearchQuery): Promise<{
        vendors: Vendor[];
        pagination: PaginationInfo;
    }> {
        const client = EcommerceDatabase.getPool();

        let whereClause = 'WHERE 1=1';
        const queryParams: any[] = [];
        let paramIndex = 1;

        // Build where clause based on filters
        if (searchQuery.query) {
            whereClause += ` AND (business_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            queryParams.push(`%${searchQuery.query}%`);
            paramIndex++;
        }

        if (searchQuery.filters?.status) {
            whereClause += ` AND status = $${paramIndex}`;
            queryParams.push(searchQuery.filters.status);
            paramIndex++;
        }

        if (searchQuery.filters?.verificationStatus) {
            whereClause += ` AND verification_status = $${paramIndex}`;
            queryParams.push(searchQuery.filters.verificationStatus);
            paramIndex++;
        }

        if (searchQuery.filters?.businessType) {
            whereClause += ` AND business_type = $${paramIndex}`;
            queryParams.push(searchQuery.filters.businessType);
            paramIndex++;
        }

        if (searchQuery.filters?.minSales !== undefined) {
            whereClause += ` AND total_sales >= $${paramIndex}`;
            queryParams.push(searchQuery.filters.minSales);
            paramIndex++;
        }

        if (searchQuery.filters?.maxSales !== undefined) {
            whereClause += ` AND total_sales <= $${paramIndex}`;
            queryParams.push(searchQuery.filters.maxSales);
            paramIndex++;
        }

        if (searchQuery.filters?.minRating !== undefined) {
            whereClause += ` AND average_rating >= $${paramIndex}`;
            queryParams.push(searchQuery.filters.minRating);
            paramIndex++;
        }

        if (searchQuery.filters?.maxRating !== undefined) {
            whereClause += ` AND average_rating <= $${paramIndex}`;
            queryParams.push(searchQuery.filters.maxRating);
            paramIndex++;
        }

        if (searchQuery.filters?.createdAfter) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            queryParams.push(searchQuery.filters.createdAfter);
            paramIndex++;
        }

        if (searchQuery.filters?.createdBefore) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            queryParams.push(searchQuery.filters.createdBefore);
            paramIndex++;
        }

        // Get total count
        const countResult = await client.query(
            `SELECT COUNT(*) FROM vendors ${whereClause}`,
            queryParams
        );
        const total = parseInt(countResult.rows[0].count);

        // Build order clause
        const sortBy = searchQuery.sortBy || 'createdAt';
        const sortOrder = searchQuery.sortOrder || 'desc';
        const orderClause = `ORDER BY ${this.mapSortField(sortBy)} ${sortOrder.toUpperCase()}`;

        // Pagination
        const page = searchQuery.page || 1;
        const limit = Math.min(searchQuery.limit || 20, 100);
        const offset = (page - 1) * limit;

        queryParams.push(limit, offset);

        const vendorsResult = await client.query(`
            SELECT * FROM vendors 
            ${whereClause}
            ${orderClause}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, queryParams);

        const vendors = vendorsResult.rows.map((row: any) => this.mapVendorFromDb(row));

        return {
            vendors,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        };
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

    private static mapNotificationFromDb(row: any): VendorNotification {
        return {
            id: row.id,
            vendorId: row.vendor_id,
            type: row.type,
            title: row.title,
            message: row.message,
            data: row.data || {},
            isRead: row.is_read,
            createdAt: new Date(row.created_at)
        };
    }

    private static mapSortField(sortBy: string): string {
        const fieldMap: Record<string, string> = {
            businessName: 'business_name',
            totalSales: 'total_sales',
            totalOrders: 'total_orders',
            averageRating: 'average_rating',
            createdAt: 'created_at'
        };

        return fieldMap[sortBy] || 'created_at';
    }
}