import { db } from '../database/connection';
import {
    Advertisement,
    CreateAdvertisementRequest,
    AdStatus,
    PaginatedResponse,
    AdServeRequest,
    AdServeResponse,
    EventType
} from '../types/advertisement.types';
import { TargetingService } from './targeting.service';
import { AnalyticsService } from './analytics.service';

export class AdvertisementService {
    private targetingService: TargetingService;
    private analyticsService: AnalyticsService;

    constructor() {
        this.targetingService = new TargetingService();
        this.analyticsService = new AnalyticsService();
    }

    async createAdvertisement(adData: CreateAdvertisementRequest): Promise<Advertisement> {
        const query = `
      INSERT INTO advertisements (ad_group_id, title, description, image_url, video_url, call_to_action, landing_url, ad_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

        const values = [
            adData.ad_group_id,
            adData.title,
            adData.description,
            adData.image_url,
            adData.video_url,
            adData.call_to_action,
            adData.landing_url,
            adData.ad_type
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getAdvertisementById(id: number): Promise<Advertisement | null> {
        const query = 'SELECT * FROM advertisements WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async getAdvertisementsByAdGroup(
        adGroupId: number,
        page: number = 1,
        limit: number = 20
    ): Promise<PaginatedResponse<Advertisement>> {
        const offset = (page - 1) * limit;

        const countQuery = 'SELECT COUNT(*) FROM advertisements WHERE ad_group_id = $1';
        const countResult = await db.query(countQuery, [adGroupId]);
        const total = parseInt(countResult.rows[0].count);

        const query = `
      SELECT * FROM advertisements 
      WHERE ad_group_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

        const result = await db.query(query, [adGroupId, limit, offset]);

        return {
            data: result.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async updateAdvertisement(
        id: number,
        updateData: Partial<CreateAdvertisementRequest & { status: AdStatus }>
    ): Promise<Advertisement | null> {
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
            return this.getAdvertisementById(id);
        }

        values.push(id);
        const query = `
      UPDATE advertisements 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await db.query(query, values);
        return result.rows[0] || null;
    }

    async deleteAdvertisement(id: number): Promise<boolean> {
        const query = 'DELETE FROM advertisements WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }

    async updateAdvertisementStatus(id: number, status: AdStatus): Promise<Advertisement | null> {
        const query = `
      UPDATE advertisements 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

        const result = await db.query(query, [status, id]);
        return result.rows[0] || null;
    }

    async serveAd(request: AdServeRequest): Promise<AdServeResponse | null> {
        // Get eligible advertisements based on targeting
        const eligibleAds = await this.getEligibleAds(request);

        if (eligibleAds.length === 0) {
            return null;
        }

        // Select ad based on bid amount and performance (simple algorithm)
        const selectedAd = this.selectAdForServing(eligibleAds);

        // Generate tracking ID
        const trackingId = this.generateTrackingId();

        // Record impression
        await this.recordAdEvent(selectedAd.id, 'impression', {
            user_id: request.user_id,
            session_id: request.session_id,
            ip_address: request.ip_address,
            user_agent: request.user_agent
        });

        return {
            advertisement: selectedAd,
            tracking_id: trackingId,
            impression_url: `/api/ads/${selectedAd.id}/impression?tracking_id=${trackingId}`,
            click_url: `/api/ads/${selectedAd.id}/click?tracking_id=${trackingId}&redirect=${encodeURIComponent(selectedAd.landing_url)}`
        };
    }

    private async getEligibleAds(request: AdServeRequest): Promise<Advertisement[]> {
        // Base query for active ads in active campaigns
        let query = `
      SELECT DISTINCT a.*, ag.bid_amount, c.advertiser_id
      FROM advertisements a
      JOIN ad_groups ag ON a.ad_group_id = ag.id
      JOIN campaigns c ON ag.campaign_id = c.id
      WHERE a.status = 'active'
      AND ag.status = 'active'
      AND c.status = 'active'
      AND c.start_date <= CURRENT_TIMESTAMP
      AND (c.end_date IS NULL OR c.end_date >= CURRENT_TIMESTAMP)
    `;

        const params: any[] = [];

        // Add targeting filters if context is provided
        if (request.targeting_context) {
            const targetingConditions = await this.buildTargetingConditions(request.targeting_context);
            if (targetingConditions.length > 0) {
                query += ` AND ag.id IN (
          SELECT DISTINCT ad_group_id FROM targeting_criteria 
          WHERE ${targetingConditions.join(' OR ')}
        )`;
            }
        }

        query += ' ORDER BY ag.bid_amount DESC, RANDOM()';

        const result = await db.query(query, params);
        return result.rows;
    }

    private async buildTargetingConditions(context: any): Promise<string[]> {
        const conditions: string[] = [];

        if (context.age) {
            conditions.push(`(criteria_type = 'age' AND criteria_value::int <= ${context.age})`);
        }

        if (context.gender) {
            conditions.push(`(criteria_type = 'gender' AND criteria_value = '${context.gender}')`);
        }

        if (context.location) {
            conditions.push(`(criteria_type = 'location' AND criteria_value ILIKE '%${context.location}%')`);
        }

        if (context.device) {
            conditions.push(`(criteria_type = 'device' AND criteria_value = '${context.device}')`);
        }

        if (context.platform) {
            conditions.push(`(criteria_type = 'platform' AND criteria_value = '${context.platform}')`);
        }

        return conditions;
    }

    private selectAdForServing(ads: Advertisement[]): Advertisement {
        // Simple selection algorithm - could be enhanced with ML
        // For now, select based on bid amount with some randomization
        const topAds = ads.slice(0, Math.min(5, ads.length));
        return topAds[Math.floor(Math.random() * topAds.length)];
    }

    private generateTrackingId(): string {
        return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async recordAdEvent(
        advertisementId: number,
        eventType: EventType,
        eventData: {
            user_id?: string;
            session_id?: string;
            ip_address?: string;
            user_agent?: string;
            referrer?: string;
            cost?: number;
        }
    ): Promise<void> {
        const query = `
      INSERT INTO ad_events (advertisement_id, event_type, user_id, session_id, ip_address, user_agent, referrer, cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

        const values = [
            advertisementId,
            eventType,
            eventData.user_id,
            eventData.session_id,
            eventData.ip_address,
            eventData.user_agent,
            eventData.referrer,
            eventData.cost || 0
        ];

        await db.query(query, values);

        // Update daily spending if this is a billable event
        if (eventType === 'click' || eventType === 'impression') {
            await this.updateDailySpending(advertisementId, eventType, eventData.cost || 0);
        }
    }

    private async updateDailySpending(advertisementId: number, eventType: EventType, cost: number): Promise<void> {
        // Get campaign ID from advertisement
        const campaignQuery = `
      SELECT c.id as campaign_id FROM campaigns c
      JOIN ad_groups ag ON c.id = ag.campaign_id
      JOIN advertisements a ON ag.id = a.ad_group_id
      WHERE a.id = $1
    `;

        const campaignResult = await db.query(campaignQuery, [advertisementId]);
        if (campaignResult.rows.length === 0) return;

        const campaignId = campaignResult.rows[0].campaign_id;
        const today = new Date().toISOString().split('T')[0];

        const updateQuery = `
      INSERT INTO campaign_spending (campaign_id, date, impressions, clicks, spend)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (campaign_id, date)
      DO UPDATE SET
        impressions = campaign_spending.impressions + EXCLUDED.impressions,
        clicks = campaign_spending.clicks + EXCLUDED.clicks,
        spend = campaign_spending.spend + EXCLUDED.spend
    `;

        const impressions = eventType === 'impression' ? 1 : 0;
        const clicks = eventType === 'click' ? 1 : 0;

        await db.query(updateQuery, [campaignId, today, impressions, clicks, cost]);
    }

    async handleAdClick(advertisementId: number, trackingId: string, eventData: any): Promise<string> {
        // Record click event
        await this.recordAdEvent(advertisementId, 'click', eventData);

        // Get landing URL
        const ad = await this.getAdvertisementById(advertisementId);
        if (!ad) {
            throw new Error('Advertisement not found');
        }

        return ad.landing_url;
    }

    async getAdvertisementsByAdvertiser(
        advertiserId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<PaginatedResponse<Advertisement>> {
        const offset = (page - 1) * limit;

        const countQuery = `
      SELECT COUNT(*) FROM advertisements a
      JOIN ad_groups ag ON a.ad_group_id = ag.id
      JOIN campaigns c ON ag.campaign_id = c.id
      WHERE c.advertiser_id = $1
    `;
        const countResult = await db.query(countQuery, [advertiserId]);
        const total = parseInt(countResult.rows[0].count);

        const query = `
      SELECT a.*, ag.name as ad_group_name, c.name as campaign_name
      FROM advertisements a
      JOIN ad_groups ag ON a.ad_group_id = ag.id
      JOIN campaigns c ON ag.campaign_id = c.id
      WHERE c.advertiser_id = $1
      ORDER BY a.created_at DESC 
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
}