/**
 * Real-time analytics dashboard service
 */

import { v4 as uuidv4 } from 'uuid';
import { redisConnection } from '../database/redis-connection';
import { analyticsService } from './analytics.service';
import { businessIntelligenceService } from './business-intelligence.service';
import { logger } from '../utils/logger';
import {
    Dashboard,
    DashboardWidget,
    DashboardMetric,
    WidgetType,
    AnalyticsQuery,
    EventType,
    AggregationType
} from '../types/analytics.types';

export class DashboardService {
    private refreshInterval: number;
    private refreshTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.refreshInterval = parseInt(process.env.DASHBOARD_REFRESH_INTERVAL || '60000');
        this.startAutoRefresh();
    }

    /**
     * Get real-time dashboard data
     */
    public async getRealTimeDashboard(): Promise<any> {
        try {
            const cacheKey = 'realtime_dashboard';
            const cached = await redisConnection.getJSON(cacheKey);

            if (cached) {
                return cached;
            }

            const [
                realTimeMetrics,
                businessMetrics,
                userActivity,
                revenueData
            ] = await Promise.all([
                analyticsService.getRealTimeMetrics(),
                businessIntelligenceService.getDashboardData(),
                this.getUserActivityMetrics(),
                this.getRevenueMetrics()
            ]);

            const dashboard = {
                realTime: realTimeMetrics,
                business: businessMetrics,
                userActivity,
                revenue: revenueData,
                lastUpdated: new Date()
            };

            // Cache for 1 minute
            await redisConnection.setJSON(cacheKey, dashboard, 60);

            return dashboard;
        } catch (error) {
            logger.error('Error getting real-time dashboard:', error);
            throw error;
        }
    }

    /**
     * Create a custom dashboard
     */
    public async createDashboard(
        name: string,
        description: string,
        widgets: Omit<DashboardWidget, 'id'>[],
        createdBy: string
    ): Promise<Dashboard> {
        try {
            const dashboard: Dashboard = {
                id: uuidv4(),
                name,
                description,
                widgets: widgets.map(widget => ({
                    ...widget,
                    id: uuidv4()
                })),
                refreshInterval: this.refreshInterval,
                isPublic: false,
                createdBy,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Store dashboard
            const cacheKey = `dashboard:${dashboard.id}`;
            await redisConnection.setJSON(cacheKey, dashboard);

            logger.info(`Dashboard created: ${name} by ${createdBy}`);
            return dashboard;
        } catch (error) {
            logger.error('Error creating dashboard:', error);
            throw error;
        }
    }

    /**
     * Get dashboard by ID
     */
    public async getDashboard(dashboardId: string): Promise<Dashboard | null> {
        try {
            const cacheKey = `dashboard:${dashboardId}`;
            return await redisConnection.getJSON<Dashboard>(cacheKey);
        } catch (error) {
            logger.error(`Error getting dashboard ${dashboardId}:`, error);
            return null;
        }
    }

    /**
     * Update dashboard
     */
    public async updateDashboard(
        dashboardId: string,
        updates: Partial<Dashboard>
    ): Promise<Dashboard | null> {
        try {
            const dashboard = await this.getDashboard(dashboardId);
            if (!dashboard) return null;

            const updatedDashboard: Dashboard = {
                ...dashboard,
                ...updates,
                updatedAt: new Date()
            };

            const cacheKey = `dashboard:${dashboardId}`;
            await redisConnection.setJSON(cacheKey, updatedDashboard);

            logger.info(`Dashboard updated: ${dashboardId}`);
            return updatedDashboard;
        } catch (error) {
            logger.error(`Error updating dashboard ${dashboardId}:`, error);
            throw error;
        }
    }

    /**
     * Execute dashboard widget query
     */
    public async executeWidgetQuery(widget: DashboardWidget): Promise<any> {
        try {
            const cacheKey = `widget:${widget.id}:data`;
            const cached = await redisConnection.getJSON(cacheKey);

            if (cached && widget.refreshInterval) {
                return cached;
            }

            let result;

            switch (widget.type) {
                case WidgetType.METRIC:
                    result = await this.executeMetricWidget(widget);
                    break;
                case WidgetType.CHART:
                    result = await this.executeChartWidget(widget);
                    break;
                case WidgetType.TABLE:
                    result = await this.executeTableWidget(widget);
                    break;
                case WidgetType.FUNNEL:
                    result = await this.executeFunnelWidget(widget);
                    break;
                default:
                    result = await analyticsService.queryAnalytics(widget.query);
            }

            // Cache result
            const cacheTTL = widget.refreshInterval ? Math.floor(widget.refreshInterval / 1000) : 300;
            await redisConnection.setJSON(cacheKey, result, cacheTTL);

            return result;
        } catch (error) {
            logger.error(`Error executing widget query for ${widget.id}:`, error);
            throw error;
        }
    }

    /**
     * Get user activity metrics
     */
    private async getUserActivityMetrics(): Promise<any> {
        try {
            const query: AnalyticsQuery = {
                eventTypes: [EventType.PAGE_VIEW, EventType.USER_ACTION],
                dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                dateTo: new Date(),
                aggregations: [AggregationType.COUNT, AggregationType.UNIQUE],
                groupBy: ['event_name']
            };

            const result = await analyticsService.queryAnalytics(query);

            return {
                totalEvents: result.data.reduce((sum: number, row: any) => sum + (row.count || 0), 0),
                uniqueUsers: result.data.reduce((sum: number, row: any) => sum + (row.unique_users || 0), 0),
                topEvents: result.data.slice(0, 10),
                lastUpdated: new Date()
            };
        } catch (error) {
            logger.error('Error getting user activity metrics:', error);
            return { totalEvents: 0, uniqueUsers: 0, topEvents: [], lastUpdated: new Date() };
        }
    }

    /**
     * Get revenue metrics for dashboard
     */
    private async getRevenueMetrics(): Promise<any> {
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const revenueMetrics = await businessIntelligenceService.generateRevenueMetrics(
                thirtyDaysAgo,
                now
            );

            return {
                ...revenueMetrics,
                lastUpdated: new Date()
            };
        } catch (error) {
            logger.error('Error getting revenue metrics:', error);
            return { totalRevenue: 0, revenueGrowth: 0, lastUpdated: new Date() };
        }
    }

    /**
     * Execute metric widget
     */
    private async executeMetricWidget(widget: DashboardWidget): Promise<DashboardMetric> {
        const result = await analyticsService.queryAnalytics(widget.query);
        const value = result.data[0]?.count || 0;

        return {
            id: widget.id,
            name: widget.title,
            description: widget.description,
            value,
            unit: widget.config.chartType || 'number',
            format: 'number'
        };
    }

    /**
     * Execute chart widget
     */
    private async executeChartWidget(widget: DashboardWidget): Promise<any> {
        const result = await analyticsService.queryAnalytics(widget.query);

        return {
            type: widget.config.chartType || 'line',
            data: result.data,
            config: widget.config
        };
    }

    /**
     * Execute table widget
     */
    private async executeTableWidget(widget: DashboardWidget): Promise<any> {
        const result = await analyticsService.queryAnalytics(widget.query);

        return {
            columns: Object.keys(result.data[0] || {}),
            rows: result.data,
            totalCount: result.totalCount
        };
    }

    /**
     * Execute funnel widget
     */
    private async executeFunnelWidget(widget: DashboardWidget): Promise<any> {
        // Extract funnel steps from widget config
        const steps = widget.config.funnelSteps || [];

        if (steps.length === 0) {
            return { steps: [], conversionRate: 0 };
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const funnel = await businessIntelligenceService.generateConversionFunnel(
            steps,
            thirtyDaysAgo,
            now
        );

        return funnel;
    }

    /**
     * Get dashboard metrics summary
     */
    public async getDashboardMetrics(): Promise<DashboardMetric[]> {
        try {
            const cacheKey = 'dashboard_metrics_summary';
            const cached = await redisConnection.getJSON<DashboardMetric[]>(cacheKey);

            if (cached) {
                return cached;
            }

            const [
                realTimeMetrics,
                kpis
            ] = await Promise.all([
                analyticsService.getRealTimeMetrics(),
                businessIntelligenceService.getKPIs()
            ]);

            const metrics: DashboardMetric[] = [
                {
                    id: 'active_users',
                    name: 'Active Users',
                    description: 'Users active in the last hour',
                    value: realTimeMetrics.active_users?.[0]?.count || 0,
                    format: 'number'
                },
                {
                    id: 'page_views',
                    name: 'Page Views',
                    description: 'Page views in the last hour',
                    value: realTimeMetrics.page_views?.[0]?.count || 0,
                    format: 'number'
                },
                ...kpis.slice(0, 4).map(kpi => ({
                    id: kpi.id,
                    name: kpi.name,
                    description: kpi.description,
                    value: kpi.currentValue,
                    change: kpi.changePercentage,
                    changeType: kpi.trend === 'up' ? 'increase' as const :
                        kpi.trend === 'down' ? 'decrease' as const : undefined,
                    format: (kpi.metric.format as any) || 'number'
                }))
            ];

            // Cache for 2 minutes
            await redisConnection.setJSON(cacheKey, metrics, 120);

            return metrics;
        } catch (error) {
            logger.error('Error getting dashboard metrics:', error);
            return [];
        }
    }

    /**
     * Start auto-refresh for real-time data
     */
    private startAutoRefresh(): void {
        this.refreshTimer = setInterval(async () => {
            try {
                // Clear cached real-time data to force refresh
                await redisConnection.del('realtime_dashboard');
                await redisConnection.del('dashboard_metrics_summary');

                logger.debug('Dashboard cache cleared for refresh');
            } catch (error) {
                logger.error('Error in dashboard auto-refresh:', error);
            }
        }, this.refreshInterval);
    }

    /**
     * Stop auto-refresh
     */
    public stopAutoRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}

export const dashboardService = new DashboardService();