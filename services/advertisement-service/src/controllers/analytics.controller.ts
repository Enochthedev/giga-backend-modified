import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { PaymentService } from '../services/payment.service';
import { analyticsRequestSchema } from '../validation/advertisement.validation';
import { ApiResponse } from '../types/advertisement.types';

export class AnalyticsController {
    private analyticsService: AnalyticsService;
    private paymentService: PaymentService;

    constructor() {
        this.analyticsService = new AnalyticsService();
        this.paymentService = new PaymentService();
    }

    async getCampaignAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.campaignId);
            const { error, value } = analyticsRequestSchema.validate(req.query);

            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const analytics = await this.analyticsService.getCampaignAnalytics(
                campaignId,
                {
                    start_date: value.start_date,
                    end_date: value.end_date
                },
                value.group_by
            );

            res.json({
                success: true,
                data: analytics
            } as ApiResponse<typeof analytics>);
        } catch (error) {
            console.error('Get campaign analytics error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getAdvertiserAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const advertiserId = req.params.advertiserId || req.user?.id;
            const { error, value } = analyticsRequestSchema.validate(req.query);

            if (!advertiserId) {
                res.status(400).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const analytics = await this.analyticsService.getAdvertiserAnalytics(
                advertiserId,
                {
                    start_date: value.start_date,
                    end_date: value.end_date
                },
                value.group_by
            );

            res.json({
                success: true,
                data: analytics
            } as ApiResponse<typeof analytics>);
        } catch (error) {
            console.error('Get advertiser analytics error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getAdGroupAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const adGroupId = parseInt(req.params.adGroupId);
            const { error, value } = analyticsRequestSchema.validate(req.query);

            if (isNaN(adGroupId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid ad group ID'
                } as ApiResponse<null>);
                return;
            }

            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const analytics = await this.analyticsService.getAdGroupAnalytics(
                adGroupId,
                {
                    start_date: value.start_date,
                    end_date: value.end_date
                }
            );

            res.json({
                success: true,
                data: analytics
            } as ApiResponse<typeof analytics>);
        } catch (error) {
            console.error('Get ad group analytics error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getTopPerformingAds(req: Request, res: Response): Promise<void> {
        try {
            const advertiserId = req.params.advertiserId || req.user?.id;
            const { error, value } = analyticsRequestSchema.validate(req.query);
            const metric = req.query.metric as 'impressions' | 'clicks' | 'ctr' | 'spend' || 'clicks';
            const limit = parseInt(req.query.limit as string) || 10;

            if (!advertiserId) {
                res.status(400).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const topAds = await this.analyticsService.getTopPerformingAds(
                advertiserId,
                {
                    start_date: value.start_date,
                    end_date: value.end_date
                },
                metric,
                limit
            );

            res.json({
                success: true,
                data: topAds
            } as ApiResponse<typeof topAds>);
        } catch (error) {
            console.error('Get top performing ads error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getDashboardMetrics(req: Request, res: Response): Promise<void> {
        try {
            const advertiserId = req.params.advertiserId || req.user?.id;

            if (!advertiserId) {
                res.status(400).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            const metrics = await this.analyticsService.getDashboardMetrics(advertiserId);

            res.json({
                success: true,
                data: metrics
            } as ApiResponse<typeof metrics>);
        } catch (error) {
            console.error('Get dashboard metrics error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getRealtimeMetrics(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.campaignId);

            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            const metrics = await this.analyticsService.getRealtimeMetrics(campaignId);

            res.json({
                success: true,
                data: metrics
            } as ApiResponse<typeof metrics>);
        } catch (error) {
            console.error('Get realtime metrics error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getHourlyMetrics(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.campaignId);
            const date = req.query.date as string;

            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid date format. Use YYYY-MM-DD'
                } as ApiResponse<null>);
                return;
            }

            const metrics = await this.analyticsService.getHourlyMetrics(campaignId, date);

            res.json({
                success: true,
                data: metrics
            } as ApiResponse<typeof metrics>);
        } catch (error) {
            console.error('Get hourly metrics error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getBillingReport(req: Request, res: Response): Promise<void> {
        try {
            const advertiserId = req.params.advertiserId || req.user?.id;
            const { error, value } = analyticsRequestSchema.validate(req.query);

            if (!advertiserId) {
                res.status(400).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const billingReport = await this.paymentService.getBillingReport(
                advertiserId,
                new Date(value.start_date),
                new Date(value.end_date)
            );

            res.json({
                success: true,
                data: billingReport
            } as ApiResponse<typeof billingReport>);
        } catch (error) {
            console.error('Get billing report error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getPerformanceComparison(req: Request, res: Response): Promise<void> {
        try {
            const advertiserId = req.params.advertiserId || req.user?.id;
            const campaignIds = req.query.campaign_ids as string;
            const { error, value } = analyticsRequestSchema.validate(req.query);

            if (!advertiserId) {
                res.status(400).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            if (!campaignIds) {
                res.status(400).json({
                    success: false,
                    error: 'Campaign IDs required'
                } as ApiResponse<null>);
                return;
            }

            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const campaignIdList = campaignIds.split(',').map(id => parseInt(id.trim()));
            const comparisons = await Promise.all(
                campaignIdList.map(campaignId =>
                    this.analyticsService.getCampaignAnalytics(
                        campaignId,
                        {
                            start_date: value.start_date,
                            end_date: value.end_date
                        },
                        value.group_by
                    )
                )
            );

            res.json({
                success: true,
                data: {
                    campaigns: campaignIdList,
                    comparisons
                }
            } as ApiResponse<any>);
        } catch (error) {
            console.error('Get performance comparison error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }
}