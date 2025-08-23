/**
 * Dashboard controller for real-time analytics
 */

import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { businessIntelligenceService } from '../services/business-intelligence.service';
import { logger } from '../utils/logger';
import { DashboardWidget } from '../types/analytics.types';

export class DashboardController {
    /**
     * Get real-time dashboard data
     */
    public async getRealTimeDashboard(req: Request, res: Response): Promise<void> {
        try {
            const dashboard = await dashboardService.getRealTimeDashboard();

            res.status(200).json({
                success: true,
                data: dashboard
            });
        } catch (error) {
            logger.error('Error in getRealTimeDashboard controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get real-time dashboard',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Create a custom dashboard
     */
    public async createDashboard(req: Request, res: Response): Promise<void> {
        try {
            const { name, description, widgets } = req.body;
            const createdBy = req.body.createdBy || 'system';

            const dashboard = await dashboardService.createDashboard(
                name,
                description,
                widgets,
                createdBy
            );

            res.status(201).json({
                success: true,
                data: dashboard,
                message: 'Dashboard created successfully'
            });
        } catch (error) {
            logger.error('Error in createDashboard controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create dashboard',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get dashboard by ID
     */
    public async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const { dashboardId } = req.params;

            const dashboard = await dashboardService.getDashboard(dashboardId);

            if (!dashboard) {
                res.status(404).json({
                    success: false,
                    message: 'Dashboard not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: dashboard
            });
        } catch (error) {
            logger.error('Error in getDashboard controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Update dashboard
     */
    public async updateDashboard(req: Request, res: Response): Promise<void> {
        try {
            const { dashboardId } = req.params;
            const updates = req.body;

            const dashboard = await dashboardService.updateDashboard(dashboardId, updates);

            if (!dashboard) {
                res.status(404).json({
                    success: false,
                    message: 'Dashboard not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: dashboard,
                message: 'Dashboard updated successfully'
            });
        } catch (error) {
            logger.error('Error in updateDashboard controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update dashboard',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Execute widget query
     */
    public async executeWidgetQuery(req: Request, res: Response): Promise<void> {
        try {
            const widget: DashboardWidget = req.body;

            const result = await dashboardService.executeWidgetQuery(widget);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error in executeWidgetQuery controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to execute widget query',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get dashboard metrics summary
     */
    public async getDashboardMetrics(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await dashboardService.getDashboardMetrics();

            res.status(200).json({
                success: true,
                data: metrics
            });
        } catch (error) {
            logger.error('Error in getDashboardMetrics controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get revenue metrics
     */
    public async getRevenueMetrics(req: Request, res: Response): Promise<void> {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) :
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
            const serviceType = req.query.serviceType as string;

            const metrics = await businessIntelligenceService.generateRevenueMetrics(
                startDate,
                endDate,
                serviceType
            );

            res.status(200).json({
                success: true,
                data: metrics
            });
        } catch (error) {
            logger.error('Error in getRevenueMetrics controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get revenue metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get performance metrics
     */
    public async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) :
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

            const metrics = await businessIntelligenceService.generatePerformanceMetrics(
                startDate,
                endDate
            );

            res.status(200).json({
                success: true,
                data: metrics
            });
        } catch (error) {
            logger.error('Error in getPerformanceMetrics controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get performance metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get conversion funnel
     */
    public async getConversionFunnel(req: Request, res: Response): Promise<void> {
        try {
            const { steps } = req.body;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) :
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

            const funnel = await businessIntelligenceService.generateConversionFunnel(
                steps,
                startDate,
                endDate
            );

            res.status(200).json({
                success: true,
                data: funnel
            });
        } catch (error) {
            logger.error('Error in getConversionFunnel controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get conversion funnel',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get KPIs
     */
    public async getKPIs(req: Request, res: Response): Promise<void> {
        try {
            const category = req.query.category as any;

            const kpis = await businessIntelligenceService.getKPIs(category);

            res.status(200).json({
                success: true,
                data: kpis
            });
        } catch (error) {
            logger.error('Error in getKPIs controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get KPIs',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}