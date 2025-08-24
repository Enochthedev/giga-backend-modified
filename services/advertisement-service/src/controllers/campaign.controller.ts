import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';
import { PaymentService } from '../services/payment.service';
import {
    createCampaignSchema,
    updateCampaignSchema,
    paginationSchema,
    analyticsRequestSchema
} from '../validation/advertisement.validation';
import { ApiResponse } from '../types/advertisement.types';

export class CampaignController {
    private campaignService: CampaignService;
    private paymentService: PaymentService;

    constructor() {
        this.campaignService = new CampaignService();
        this.paymentService = new PaymentService();
    }

    async createCampaign(req: Request, res: Response): Promise<void> {
        try {
            const { error, value } = createCampaignSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const advertiserId = req.user?.id || req.body.advertiser_id;
            if (!advertiserId) {
                res.status(401).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            const campaign = await this.campaignService.createCampaign(advertiserId, value);

            res.status(201).json({
                success: true,
                data: campaign,
                message: 'Campaign created successfully'
            } as ApiResponse<typeof campaign>);
        } catch (error) {
            console.error('Create campaign error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getCampaign(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.id);
            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            const campaign = await this.campaignService.getCampaignById(campaignId);
            if (!campaign) {
                res.status(404).json({
                    success: false,
                    error: 'Campaign not found'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: campaign
            } as ApiResponse<typeof campaign>);
        } catch (error) {
            console.error('Get campaign error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getCampaigns(req: Request, res: Response): Promise<void> {
        try {
            const { error, value } = paginationSchema.validate(req.query);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const advertiserId = req.user?.id || req.query.advertiser_id as string;
            if (!advertiserId) {
                res.status(401).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            const campaigns = await this.campaignService.getCampaignsByAdvertiser(
                advertiserId,
                value.page,
                value.limit
            );

            res.json({
                success: true,
                data: campaigns
            } as ApiResponse<typeof campaigns>);
        } catch (error) {
            console.error('Get campaigns error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async updateCampaign(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.id);
            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            const { error, value } = updateCampaignSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.details[0].message
                } as ApiResponse<null>);
                return;
            }

            const campaign = await this.campaignService.updateCampaign(campaignId, value);
            if (!campaign) {
                res.status(404).json({
                    success: false,
                    error: 'Campaign not found'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: campaign,
                message: 'Campaign updated successfully'
            } as ApiResponse<typeof campaign>);
        } catch (error) {
            console.error('Update campaign error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async deleteCampaign(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.id);
            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            const deleted = await this.campaignService.deleteCampaign(campaignId);
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Campaign not found'
                } as ApiResponse<null>);
                return;
            }

            res.status(204).send();
        } catch (error) {
            console.error('Delete campaign error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async updateCampaignStatus(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.id);
            const { status } = req.body;

            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            if (!['draft', 'active', 'paused', 'completed', 'cancelled'].includes(status)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid status'
                } as ApiResponse<null>);
                return;
            }

            const campaign = await this.campaignService.updateCampaignStatus(campaignId, status);
            if (!campaign) {
                res.status(404).json({
                    success: false,
                    error: 'Campaign not found'
                } as ApiResponse<null>);
                return;
            }

            res.json({
                success: true,
                data: campaign,
                message: `Campaign ${status} successfully`
            } as ApiResponse<typeof campaign>);
        } catch (error) {
            console.error('Update campaign status error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async getCampaignSpending(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.id);
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

            const spending = await this.campaignService.getCampaignSpending(
                campaignId,
                new Date(value.start_date),
                new Date(value.end_date)
            );

            res.json({
                success: true,
                data: spending
            } as ApiResponse<typeof spending>);
        } catch (error) {
            console.error('Get campaign spending error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async checkBudgetAvailability(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.id);
            if (isNaN(campaignId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID'
                } as ApiResponse<null>);
                return;
            }

            const budgetInfo = await this.campaignService.checkBudgetAvailability(campaignId);

            res.json({
                success: true,
                data: budgetInfo
            } as ApiResponse<typeof budgetInfo>);
        } catch (error) {
            console.error('Check budget availability error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }

    async fundCampaign(req: Request, res: Response): Promise<void> {
        try {
            const campaignId = parseInt(req.params.id);
            const { amount, payment_method, payment_details } = req.body;

            if (isNaN(campaignId) || !amount || amount <= 0) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID or amount'
                } as ApiResponse<null>);
                return;
            }

            const advertiserId = req.user?.id;
            if (!advertiserId) {
                res.status(401).json({
                    success: false,
                    error: 'Advertiser ID required'
                } as ApiResponse<null>);
                return;
            }

            const paymentResult = await this.paymentService.processPayment(
                advertiserId,
                campaignId,
                amount,
                payment_method,
                payment_details
            );

            if (paymentResult.success) {
                res.json({
                    success: true,
                    data: paymentResult.transaction,
                    message: 'Campaign funded successfully'
                } as ApiResponse<typeof paymentResult.transaction>);
            } else {
                res.status(400).json({
                    success: false,
                    error: paymentResult.error
                } as ApiResponse<null>);
            }
        } catch (error) {
            console.error('Fund campaign error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            } as ApiResponse<null>);
        }
    }
}