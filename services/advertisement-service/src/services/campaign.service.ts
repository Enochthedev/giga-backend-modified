import { db } from '../database/connection';
import {
    Campaign,
    CreateCampaignRequest,
    UpdateCampaignRequest,
    CampaignStatus,
    PaginatedResponse
} from '../types/advertisement.types';

export class CampaignService {
    async createCampaign(advertiserId: string, campaignData: CreateCampaignRequest): Promise<Campaign> {
        const query = `
      INSERT INTO campaigns (name, description, advertiser_id, budget, daily_budget, start_date, end_date, objective)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

        const values = [
            campaignData.name,
            campaignData.description,
            advertiserId,
            campaignData.budget,
            campaignData.daily_budget,
            campaignData.start_date,
            campaignData.end_date,
            campaignData.objective
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getCampaignById(id: number): Promise<Campaign | null> {
        const query = 'SELECT * FROM campaigns WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async getCampaignsByAdvertiser(
        advertiserId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<PaginatedResponse<Campaign>> {
        const offset = (page - 1) * limit;

        const countQuery = 'SELECT COUNT(*) FROM campaigns WHERE advertiser_id = $1';
        const countResult = await db.query(countQuery, [advertiserId]);
        const total = parseInt(countResult.rows[0].count);

        const query = `
      SELECT * FROM campaigns 
      WHERE advertiser_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

        const result = await db.query(query, [advertiserId, limit, offset]);

        return {
            data: result.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async updateCampaign(id: number, updateData: UpdateCampaignRequest): Promise<Campaign | null> {
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
            return this.getCampaignById(id);
        }

        values.push(id);
        const query = `
      UPDATE campaigns 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await db.query(query, values);
        return result.rows[0] || null;
    }

    async deleteCampaign(id: number): Promise<boolean> {
        const query = 'DELETE FROM campaigns WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }

    async updateCampaignStatus(id: number, status: CampaignStatus): Promise<Campaign | null> {
        const query = `
      UPDATE campaigns 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

        const result = await db.query(query, [status, id]);
        return result.rows[0] || null;
    }

    async getActiveCampaigns(): Promise<Campaign[]> {
        const query = `
      SELECT * FROM campaigns 
      WHERE status = 'active' 
      AND start_date <= CURRENT_TIMESTAMP 
      AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
    `;

        const result = await db.query(query);
        return result.rows;
    }

    async getCampaignSpending(campaignId: number, startDate: Date, endDate: Date): Promise<any[]> {
        const query = `
      SELECT 
        date,
        impressions,
        clicks,
        conversions,
        spend,
        CASE WHEN impressions > 0 THEN (clicks::float / impressions * 100) ELSE 0 END as ctr,
        CASE WHEN clicks > 0 THEN (spend / clicks) ELSE 0 END as cpc,
        CASE WHEN impressions > 0 THEN (spend / impressions * 1000) ELSE 0 END as cpm
      FROM campaign_spending 
      WHERE campaign_id = $1 
      AND date BETWEEN $2 AND $3
      ORDER BY date DESC
    `;

        const result = await db.query(query, [campaignId, startDate, endDate]);
        return result.rows;
    }

    async checkBudgetAvailability(campaignId: number): Promise<{ available: boolean; remaining: number }> {
        const campaignQuery = 'SELECT budget, daily_budget FROM campaigns WHERE id = $1';
        const campaignResult = await db.query(campaignQuery, [campaignId]);

        if (campaignResult.rows.length === 0) {
            return { available: false, remaining: 0 };
        }

        const campaign = campaignResult.rows[0];

        // Check total budget
        const totalSpentQuery = `
      SELECT COALESCE(SUM(spend), 0) as total_spent 
      FROM campaign_spending 
      WHERE campaign_id = $1
    `;
        const totalSpentResult = await db.query(totalSpentQuery, [campaignId]);
        const totalSpent = parseFloat(totalSpentResult.rows[0].total_spent);

        const remainingBudget = campaign.budget - totalSpent;

        if (remainingBudget <= 0) {
            return { available: false, remaining: 0 };
        }

        // Check daily budget if set
        if (campaign.daily_budget) {
            const today = new Date().toISOString().split('T')[0];
            const dailySpentQuery = `
        SELECT COALESCE(spend, 0) as daily_spent 
        FROM campaign_spending 
        WHERE campaign_id = $1 AND date = $2
      `;
            const dailySpentResult = await db.query(dailySpentQuery, [campaignId, today]);
            const dailySpent = dailySpentResult.rows[0]?.daily_spent || 0;

            const remainingDailyBudget = campaign.daily_budget - dailySpent;

            if (remainingDailyBudget <= 0) {
                return { available: false, remaining: remainingBudget };
            }

            return {
                available: true,
                remaining: Math.min(remainingBudget, remainingDailyBudget)
            };
        }

        return { available: true, remaining: remainingBudget };
    }
}