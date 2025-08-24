import { db } from '../database/connection';
import {
    AdAnalytics,
    CampaignAnalyticsRequest,
    AnalyticsDateRange
} from '../types/advertisement.types';

export class AnalyticsService {
    async getCampaignAnalytics(
        campaignId: number,
        dateRange: AnalyticsDateRange,
        groupBy: 'day' | 'week' | 'month' = 'day'
    ): Promise<AdAnalytics[]> {
        const dateFormat = this.getDateFormat(groupBy);

        const query = `
      SELECT 
        $1 as campaign_id,
        DATE_TRUNC($2, cs.date) as period,
        SUM(cs.impressions) as impressions,
        SUM(cs.clicks) as clicks,
        SUM(cs.conversions) as conversions,
        SUM(cs.spend) as spend,
        CASE 
          WHEN SUM(cs.impressions) > 0 
          THEN (SUM(cs.clicks)::float / SUM(cs.impressions) * 100)
          ELSE 0 
        END as ctr,
        CASE 
          WHEN SUM(cs.clicks) > 0 
          THEN (SUM(cs.spend) / SUM(cs.clicks))
          ELSE 0 
        END as cpc,
        CASE 
          WHEN SUM(cs.impressions) > 0 
          THEN (SUM(cs.spend) / SUM(cs.impressions) * 1000)
          ELSE 0 
        END as cpm,
        CASE 
          WHEN SUM(cs.impressions) > 0 
          THEN (SUM(cs.conversions)::float / SUM(cs.impressions) * 100)
          ELSE 0 
        END as conversion_rate,
        CASE 
          WHEN SUM(cs.conversions) > 0 
          THEN (SUM(cs.spend) / SUM(cs.conversions))
          ELSE 0 
        END as cost_per_conversion
      FROM campaign_spending cs
      WHERE cs.campaign_id = $1
      AND cs.date BETWEEN $3 AND $4
      GROUP BY DATE_TRUNC($2, cs.date)
      ORDER BY period DESC
    `;

        const result = await db.query(query, [
            campaignId,
            groupBy,
            dateRange.start_date,
            dateRange.end_date
        ]);

        return result.rows;
    }

    async getAdvertiserAnalytics(
        advertiserId: string,
        dateRange: AnalyticsDateRange,
        groupBy: 'day' | 'week' | 'month' = 'day'
    ): Promise<any[]> {
        const query = `
      SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        DATE_TRUNC($1, cs.date) as period,
        SUM(cs.impressions) as impressions,
        SUM(cs.clicks) as clicks,
        SUM(cs.conversions) as conversions,
        SUM(cs.spend) as spend,
        CASE 
          WHEN SUM(cs.impressions) > 0 
          THEN (SUM(cs.clicks)::float / SUM(cs.impressions) * 100)
          ELSE 0 
        END as ctr,
        CASE 
          WHEN SUM(cs.clicks) > 0 
          THEN (SUM(cs.spend) / SUM(cs.clicks))
          ELSE 0 
        END as cpc
      FROM campaign_spending cs
      JOIN campaigns c ON cs.campaign_id = c.id
      WHERE c.advertiser_id = $2
      AND cs.date BETWEEN $3 AND $4
      GROUP BY c.id, c.name, DATE_TRUNC($1, cs.date)
      ORDER BY period DESC, campaign_name
    `;

        const result = await db.query(query, [
            groupBy,
            advertiserId,
            dateRange.start_date,
            dateRange.end_date
        ]);

        return result.rows;
    }

    async getAdGroupAnalytics(
        adGroupId: number,
        dateRange: AnalyticsDateRange
    ): Promise<any> {
        const query = `
      SELECT 
        ag.id as ad_group_id,
        ag.name as ad_group_name,
        COUNT(DISTINCT a.id) as total_ads,
        SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
        SUM(CASE WHEN ae.event_type = 'click' THEN 1 ELSE 0 END) as clicks,
        SUM(CASE WHEN ae.event_type = 'conversion' THEN 1 ELSE 0 END) as conversions,
        SUM(ae.cost) as spend,
        CASE 
          WHEN SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) > 0 
          THEN (SUM(CASE WHEN ae.event_type = 'click' THEN 1 ELSE 0 END)::float / 
                SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) * 100)
          ELSE 0 
        END as ctr
      FROM ad_groups ag
      LEFT JOIN advertisements a ON ag.id = a.ad_group_id
      LEFT JOIN ad_events ae ON a.id = ae.advertisement_id 
        AND ae.timestamp BETWEEN $2 AND $3
      WHERE ag.id = $1
      GROUP BY ag.id, ag.name
    `;

        const result = await db.query(query, [
            adGroupId,
            dateRange.start_date,
            dateRange.end_date
        ]);

        return result.rows[0] || null;
    }

    async getAdvertisementAnalytics(
        advertisementId: number,
        dateRange: AnalyticsDateRange
    ): Promise<any> {
        const query = `
      SELECT 
        a.id as advertisement_id,
        a.title,
        a.ad_type,
        SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
        SUM(CASE WHEN ae.event_type = 'click' THEN 1 ELSE 0 END) as clicks,
        SUM(CASE WHEN ae.event_type = 'conversion' THEN 1 ELSE 0 END) as conversions,
        SUM(ae.cost) as spend,
        CASE 
          WHEN SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) > 0 
          THEN (SUM(CASE WHEN ae.event_type = 'click' THEN 1 ELSE 0 END)::float / 
                SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) * 100)
          ELSE 0 
        END as ctr,
        COUNT(DISTINCT ae.user_id) as unique_users
      FROM advertisements a
      LEFT JOIN ad_events ae ON a.id = ae.advertisement_id 
        AND ae.timestamp BETWEEN $2 AND $3
      WHERE a.id = $1
      GROUP BY a.id, a.title, a.ad_type
    `;

        const result = await db.query(query, [
            advertisementId,
            dateRange.start_date,
            dateRange.end_date
        ]);

        return result.rows[0] || null;
    }

    async getTopPerformingAds(
        advertiserId: string,
        dateRange: AnalyticsDateRange,
        metric: 'impressions' | 'clicks' | 'ctr' | 'spend' = 'clicks',
        limit: number = 10
    ): Promise<any[]> {
        const orderByClause = this.getOrderByClause(metric);

        const query = `
      SELECT 
        a.id,
        a.title,
        a.ad_type,
        c.name as campaign_name,
        SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) as impressions,
        SUM(CASE WHEN ae.event_type = 'click' THEN 1 ELSE 0 END) as clicks,
        SUM(ae.cost) as spend,
        CASE 
          WHEN SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) > 0 
          THEN (SUM(CASE WHEN ae.event_type = 'click' THEN 1 ELSE 0 END)::float / 
                SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) * 100)
          ELSE 0 
        END as ctr
      FROM advertisements a
      JOIN ad_groups ag ON a.ad_group_id = ag.id
      JOIN campaigns c ON ag.campaign_id = c.id
      LEFT JOIN ad_events ae ON a.id = ae.advertisement_id 
        AND ae.timestamp BETWEEN $2 AND $3
      WHERE c.advertiser_id = $1
      GROUP BY a.id, a.title, a.ad_type, c.name
      HAVING SUM(CASE WHEN ae.event_type = 'impression' THEN 1 ELSE 0 END) > 0
      ORDER BY ${orderByClause} DESC
      LIMIT $4
    `;

        const result = await db.query(query, [
            advertiserId,
            dateRange.start_date,
            dateRange.end_date,
            limit
        ]);

        return result.rows;
    }

    async getDashboardMetrics(advertiserId: string): Promise<any> {
        const query = `
      SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT ag.id) as total_ad_groups,
        COUNT(DISTINCT a.id) as total_ads,
        SUM(c.budget) as total_budget,
        SUM(cs.spend) as total_spend,
        SUM(cs.impressions) as total_impressions,
        SUM(cs.clicks) as total_clicks,
        CASE 
          WHEN SUM(cs.impressions) > 0 
          THEN (SUM(cs.clicks)::float / SUM(cs.impressions) * 100)
          ELSE 0 
        END as overall_ctr
      FROM campaigns c
      LEFT JOIN ad_groups ag ON c.id = ag.campaign_id
      LEFT JOIN advertisements a ON ag.id = a.ad_group_id
      LEFT JOIN campaign_spending cs ON c.id = cs.campaign_id
      WHERE c.advertiser_id = $1
    `;

        const result = await db.query(query, [advertiserId]);
        return result.rows[0] || {};
    }

    async getRealtimeMetrics(campaignId: number): Promise<any> {
        const today = new Date().toISOString().split('T')[0];

        const query = `
      SELECT 
        COALESCE(cs.impressions, 0) as today_impressions,
        COALESCE(cs.clicks, 0) as today_clicks,
        COALESCE(cs.spend, 0) as today_spend,
        c.budget,
        c.daily_budget,
        CASE 
          WHEN c.daily_budget IS NOT NULL 
          THEN (COALESCE(cs.spend, 0) / c.daily_budget * 100)
          ELSE (COALESCE(cs.spend, 0) / c.budget * 100)
        END as budget_utilization
      FROM campaigns c
      LEFT JOIN campaign_spending cs ON c.id = cs.campaign_id AND cs.date = $2
      WHERE c.id = $1
    `;

        const result = await db.query(query, [campaignId, today]);
        return result.rows[0] || {};
    }

    async getHourlyMetrics(
        campaignId: number,
        date: string
    ): Promise<any[]> {
        const query = `
      SELECT 
        EXTRACT(HOUR FROM ae.timestamp) as hour,
        COUNT(CASE WHEN ae.event_type = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN ae.event_type = 'click' THEN 1 END) as clicks,
        SUM(ae.cost) as spend
      FROM ad_events ae
      JOIN advertisements a ON ae.advertisement_id = a.id
      JOIN ad_groups ag ON a.ad_group_id = ag.id
      WHERE ag.campaign_id = $1
      AND DATE(ae.timestamp) = $2
      GROUP BY EXTRACT(HOUR FROM ae.timestamp)
      ORDER BY hour
    `;

        const result = await db.query(query, [campaignId, date]);
        return result.rows;
    }

    private getDateFormat(groupBy: string): string {
        switch (groupBy) {
            case 'week':
                return 'week';
            case 'month':
                return 'month';
            default:
                return 'day';
        }
    }

    private getOrderByClause(metric: string): string {
        switch (metric) {
            case 'impressions':
                return 'impressions';
            case 'clicks':
                return 'clicks';
            case 'ctr':
                return 'ctr';
            case 'spend':
                return 'spend';
            default:
                return 'clicks';
        }
    }
}