/**
 * Analytics controller for event tracking and querying
 */

import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';
import { TrackingRequest, AnalyticsQuery } from '../types/analytics.types';

export class AnalyticsController {
    /**
     * Track a single analytics event
     */
    public async trackEvent(req: Request, res: Response): Promise<void> {
        try {
            const trackingRequest: TrackingRequest = {
                eventName: req.body.eventName,
                properties: req.body.properties,
                userId: req.body.userId,
                sessionId: req.body.sessionId,
                source: req.body.source,
                metadata: {
                    userAgent: req.get('User-Agent'),
                    ipAddress: req.ip,
                    referrer: req.get('Referer'),
                    ...req.body.metadata
                }
            };

            await analyticsService.trackEvent(trackingRequest);

            res.status(200).json({
                success: true,
                message: 'Event tracked successfully'
            });
        } catch (error) {
            logger.error('Error in trackEvent controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track event',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Track multiple events in batch
     */
    public async trackEvents(req: Request, res: Response): Promise<void> {
        try {
            const events: TrackingRequest[] = req.body.events.map((event: any) => ({
                eventName: event.eventName,
                properties: event.properties,
                userId: event.userId,
                sessionId: event.sessionId,
                source: event.source,
                metadata: {
                    userAgent: req.get('User-Agent'),
                    ipAddress: req.ip,
                    referrer: req.get('Referer'),
                    ...event.metadata
                }
            }));

            await analyticsService.trackEvents(events);

            res.status(200).json({
                success: true,
                message: `${events.length} events tracked successfully`
            });
        } catch (error) {
            logger.error('Error in trackEvents controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track events',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Query analytics data
     */
    public async queryAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const query: AnalyticsQuery = {
                eventTypes: req.body.eventTypes,
                eventNames: req.body.eventNames,
                userIds: req.body.userIds,
                dateFrom: req.body.dateFrom ? new Date(req.body.dateFrom) : undefined,
                dateTo: req.body.dateTo ? new Date(req.body.dateTo) : undefined,
                groupBy: req.body.groupBy,
                aggregations: req.body.aggregations,
                filters: req.body.filters,
                limit: req.body.limit,
                offset: req.body.offset
            };

            const result = await analyticsService.queryAnalytics(query);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error in queryAnalytics controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to query analytics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get real-time metrics
     */
    public async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await analyticsService.getRealTimeMetrics();

            res.status(200).json({
                success: true,
                data: metrics
            });
        } catch (error) {
            logger.error('Error in getRealTimeMetrics controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get real-time metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get user behavior analytics
     */
    public async getUserBehavior(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const days = parseInt(req.query.days as string) || 30;

            const behavior = await analyticsService.getUserBehavior(userId, days);

            res.status(200).json({
                success: true,
                data: behavior
            });
        } catch (error) {
            logger.error('Error in getUserBehavior controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user behavior',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Health check endpoint
     */
    public async healthCheck(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({
                success: true,
                message: 'Analytics service is healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error in healthCheck controller:', error);
            res.status(500).json({
                success: false,
                message: 'Analytics service is unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}