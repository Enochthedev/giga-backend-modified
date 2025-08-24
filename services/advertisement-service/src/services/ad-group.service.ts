import { db } from '../database/connection';
import {
    AdGroup,
    CreateAdGroupRequest,
    AdGroupStatus,
    PaginatedResponse
} from '../types/advertisement.types';

export class AdGroupService {
    async createAdGroup(adGroupData: CreateAdGroupRequest): Promise<AdGroup> {
        const query = `
      INSERT INTO ad_groups (campaign_id, name, bid_amount)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

        const values = [
            adGroupData.campaign_id,
            adGroupData.name,
            adGroupData.bid_amount
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getAdGroupById(id: number): Promise<AdGroup | null> {
        const query = 'SELECT * FROM ad_groups WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async getAdGroupsByCampaign(
        campaignId: number,
        page: number = 1,
        limit: number = 20
    ): Promise<PaginatedResponse<AdGroup>> {
        const offset = (page - 1) * limit;

        const countQuery = 'SELECT COUNT(*) FROM ad_groups WHERE campaign_id = $1';
        const countResult = await db.query(countQuery, [campaignId]);
        const total = parseInt(countResult.rows[0].count);

        const query = `
      SELECT * FROM ad_groups 
      WHERE campaign_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

        const result = await db.query(query, [campaignId, limit, offset]);

        return {
            data: result.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async updateAdGroup(
        id: number,
        updateData: { name?: string; bid_amount?: number; status?: AdGroupStatus }
    ): Promise<AdGroup | null> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (setClauses.length === 0) {
            return this.getAdGroupById(id);
        }

        values.push(id);
        const query = `
      UPDATE ad_groups 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await db.query(query, values);
        return result.rows[0] || null;
    }

    async deleteAdGroup(id: number): Promise<boolean> {
        const query = 'DELETE FROM ad_groups WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }

    async updateAdGroupStatus(id: number, status: AdGroupStatus): Promise<AdGroup | null> {
        const query = `
      UPDATE ad_groups 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

        const result = await db.query(query, [status, id]);
        return result.rows[0] || null;
    }

    async getActiveAdGroups(campaignId: number): Promise<AdGroup[]> {
        const query = `
      SELECT ag.* FROM ad_groups ag
      JOIN campaigns c ON ag.campaign_id = c.id
      WHERE ag.campaign_id = $1 
      AND ag.status = 'active'
      AND c.status = 'active'
      AND c.start_date <= CURRENT_TIMESTAMP 
      AND (c.end_date IS NULL OR c.end_date >= CURRENT_TIMESTAMP)
      ORDER BY ag.bid_amount DESC
    `;

        const result = await db.query(query, [campaignId]);
        return result.rows;
    }

    async getAdGroupWithCampaign(id: number): Promise<any> {
        const query = `
      SELECT 
        ag.*,
        c.name as campaign_name,
        c.status as campaign_status,
        c.advertiser_id,
        c.budget as campaign_budget
      FROM ad_groups ag
      JOIN campaigns c ON ag.campaign_id = c.id
      WHERE ag.id = $1
    `;

        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }
}