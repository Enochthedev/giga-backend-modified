import { Request, Response } from 'express';
import { AdvertisementService } from '../services/advertisement.service';
import { AnalyticsService } from '../services/analytics.service';
import {
    createAdvertisementSchema,
    updateAdvertisementSchema,
    adServeRequestSchema,
    paginationSchema,
    analyticsRequestSchema
} from '../validation/advertisement.validation';
import { ApiResponse } from '../types/advertisement.types';

export class AdvertisementController {
    private advertisementService: AdvertisementService;
    private analyticsService: AnalyticsService;

    constructor() {
        this.advertisementService = new AdvertisementService();
        this.analyticsService = new AnalyticsService();
    }

    async createAdvertisement(req: Request, res: Response): Promise<void> {
        try {
            const { error, value } = createAdvertisementSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const advertisement = await this.advertisementService.createAdvertisement(value);

            res.status(201).json({
                success: true,
                data: advertisement,
                message: 'Advertisement created successfully'
            } as ApiResponse<typeof advertisement>);
        } catch (error) {
            console.error('Create advertisement error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getAdvertisement(req: Request, res: Response): Promise<void> {
        try {
            const advertisementId = parseInt(req.params.id);
            if (isNaN(advertisementId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid advertisement ID'
                } as ApiResponse<null>);
                return;
            }

            const advertisement = await this.advertisementService.getAdvertisementById(advertisementId);
            if (!advertisement) {
                res.status(404).json({
                    success: false,
                    error: 'Advertisement not found'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: advertisement
            } as ApiResponse<typeof advertisement>);
        } catch (error) {
            console.error('Get advertisement error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getAdvertisements(req: Request, res: Response): Promise<void> {
        try {
            const { error, value } = paginationSchema.validate(req.query);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const adGroupId = parseInt(req.query.ad_group_id as string);
            const advertiserId = req.query.advertiser_id as string;

            let advertisements;

            if (!isNaN(adGroupId)) {
                advertisements = await this.advertisementService.getAdvertisementsByAdGroup(
                    adGroupId,
                    value.page,
                    value.limit
                );
            } else if (advertiserId) {
                advertisements = await this.advertisementService.getAdvertisementsByAdvertiser(
                    advertiserId,
                    value.page,
                    value.limit
                );
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Either ad_group_id or advertiser_id is required'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: advertisements
            } as ApiResponse<typeof advertisements>);
        } catch (error) {
            console.error('Get advertisements error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async updateAdvertisement(req: Request, res: Response): Promise<void> {
        try {
            const advertisementId = parseInt(req.params.id);
            if (isNaN(advertisementId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid advertisement ID'
                } as ApiResponse<null>);
                return;
            }

            const { error, value } = updateAdvertisementSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const advertisement = await this.advertisementService.updateAdvertisement(advertisementId, value);
            if (!advertisement) {
                res.status(404).json({
                    success: false,
                    error: 'Advertisement not found'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: advertisement,
                message: 'Advertisement updated successfully'
            } as ApiResponse<typeof advertisement>);
        } catch (error) {
            console.error('Update advertisement error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async deleteAdvertisement(req: Request, res: Response): Promise<void> {
        try {
            const advertisementId = parseInt(req.params.id);
            if (isNaN(advertisementId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid advertisement ID'
                } as ApiResponse<null>);
                return;
            }

            const deleted = await this.advertisementService.deleteAdvertisement(advertisementId);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Advertisement not found'
                } as ApiResponse<null>);
                return;
            }

            res.status(204).send();
        } catch (error) {
            console.error('Delete advertisement error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async serveAd(req: Request, res: Response): Promise<void> {
        try {
            const { error, value } = adServeRequestSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            // Add IP and user agent from request if not provided
            const serveRequest = {
                ...value,
                ip_address: value.ip_address || req.ip,
                user_agent: value.user_agent || req.get('User-Agent')
            };

            const adResponse = await this.advertisementService.serveAd(serveRequest);

            if (!adResponse) {
                res.status(404).json({
                    success: false,
                    error: 'No advertisements available'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: adResponse
            } as ApiResponse<typeof adResponse>);
        } catch (error) {
            console.error('Serve ad error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async handleAdClick(req: Request, res: Response): Promise<void> {
        try {
            const advertisementId = parseInt(req.params.id);
            const trackingId = req.query.tracking_id as string;
            const redirectUrl = req.query.redirect as string;

            if (isNaN(advertisementId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid advertisement ID'
                } as ApiResponse<null>);
                return;
            }

            const eventData = {
                user_id: req.query.user_id as string,
                session_id: req.query.session_id as string,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                referrer: req.get('Referer')
            };

            const landingUrl = await this.advertisementService.handleAdClick(
                advertisementId,
                trackingId,
                eventData
            );

            // Redirect to landing page or provided redirect URL
            const finalUrl = redirectUrl || landingUrl;
            res.redirect(finalUrl);
        } catch (error) {
            console.error('Handle ad click error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async recordImpression(req: Request, res: Response): Promise<void> {
        try {
            const advertisementId = parseInt(req.params.id);
            const trackingId = req.query.tracking_id as string;

            if (isNaN(advertisementId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid advertisement ID'
                } as ApiResponse<null>);
                return;
            }

            const eventData = {
                user_id: req.query.user_id as string,
                session_id: req.query.session_id as string,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                referrer: req.get('Referer')
            };

            await this.advertisementService.recordAdEvent(advertisementId, 'impression', eventData);

            // Return 1x1 pixel image for tracking
            const pixel = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                'base64'
            );

            res.set({
                'Content-Type': 'image/png',
                'Content-Length': pixel.length,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            res.send(pixel);
        } catch (error) {
            console.error('Record impression error:', error);
            res.status(500).send();
        }
    }

    async getAdvertisementAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const advertisementId = parseInt(req.params.id);
            const { error, value } = analyticsRequestSchema.validate(req.query);

            if (isNaN(advertisementId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid advertisement ID'
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

            const analytics = await this.analyticsService.getAdvertisementAnalytics(
                advertisementId,
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
            console.error('Get advertisement analytics error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async updateAdvertisementStatus(req: Request, res: Response): Promise<void> {
        try {
            const advertisementId = parseInt(req.params.id);
            const { status } = req.body;

            if (isNaN(advertisementId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid advertisement ID'
                } as ApiResponse<null>);
                return;
            }

            if (!['active', 'paused', 'rejected'].includes(status)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid status'
                } as ApiResponse<null>);
                return;
            }

            const advertisement = await this.advertisementService.updateAdvertisementStatus(
                advertisementId,
                status
            );

            if (!advertisement) {
                res.status(404).json({
                    success: false,
                    error: 'Advertisement not found'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: advertisement,
                message: `Advertisement ${status} successfully`
            } as ApiResponse<typeof advertisement>);
        } catch (error) {
            console.error('Update advertisement status error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }
}