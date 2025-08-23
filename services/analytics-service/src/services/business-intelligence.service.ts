/**
 * Business Intelligence and reporting service
 */

import { v4 as uuidv4 } from 'uuid';
// Mock node-cron for development
const cron = {
    schedule: (pattern: string, task: () => void, options?: any) => ({
        start: () => { },
        stop: () => { }
    })
};
import { clickHouseConnection } from '../database/clickhouse-connection';
import { redisConnection } from '../database/redis-connection';
import { logger } from '../utils/logger';
import {
    BusinessReport,
    ReportExecution,
    KPI,
    RevenueMetrics,
    PerformanceMetrics,
    ConversionFunnel,
    ReportType,
    ExecutionStatus,
    KPICategory,
    TrendDirection
} from '../types/business-intelligence.types';

export class BusinessIntelligenceService {
    private scheduledReports: Map<string, any> = new Map();

    constructor() {
        this.initializeScheduledReports();
    }

    /**
     * Generate revenue metrics report
     */
    public async generateRevenueMetrics(
        startDate: Date,
        endDate: Date,
        serviceType?: string
    ): Promise<RevenueMetrics> {
        try {
            const client = clickHouseConnection.getClient();

            let whereClause = `timestamp >= '${startDate.toISOString()}' AND timestamp <= '${endDate.toISOString()}'`;
            if (serviceType) {
                whereClause += ` AND service_type = '${serviceType}'`;
            }

            // Total revenue
            const revenueQuery = `
        SELECT 
          sum(amount) as total_revenue,
          count(DISTINCT user_id) as unique_customers,
          count() as total_transactions,
          avg(amount) as average_order_value
        FROM revenue_events
        WHERE ${whereClause} AND status = 'completed'
      `;

            // Revenue growth (compare with previous period)
            const previousStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
            const previousEnd = startDate;

            const previousRevenueQuery = `
        SELECT sum(amount) as previous_revenue
        FROM revenue_events
        WHERE timestamp >= '${previousStart.toISOString()}' 
        AND timestamp <= '${previousEnd.toISOString()}'
        AND status = 'completed'
        ${serviceType ? `AND service_type = '${serviceType}'` : ''}
      `;

            // Customer metrics
            const customerMetricsQuery = `
        SELECT 
          avg(customer_lifetime_value) as avg_clv,
          avg(revenue_per_user) as avg_rpu
        FROM (
          SELECT 
            user_id,
            sum(amount) as customer_lifetime_value,
            sum(amount) / count(DISTINCT toYYYYMM(timestamp)) as revenue_per_user
          FROM revenue_events
          WHERE ${whereClause} AND status = 'completed'
          GROUP BY user_id
        )
      `;

            const [revenueResult, previousRevenueResult, customerResult] = await Promise.all([
                client.query({ query: revenueQuery }),
                client.query({ query: previousRevenueQuery }),
                client.query({ query: customerMetricsQuery })
            ]);

            const revenueData = (await revenueResult.json()).data[0];
            const previousRevenueData = (await previousRevenueResult.json()).data[0];
            const customerData = (await customerResult.json()).data[0];

            const totalRevenue = revenueData?.total_revenue || 0;
            const previousRevenue = previousRevenueData?.previous_revenue || 0;
            const revenueGrowth = previousRevenue > 0 ?
                ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

            return {
                totalRevenue,
                revenueGrowth,
                averageOrderValue: revenueData?.average_order_value || 0,
                customerLifetimeValue: customerData?.avg_clv || 0,
                revenuePerUser: customerData?.avg_rpu || 0,
                conversionRate: 0, // Calculate from analytics events
                churnRate: 0 // Calculate from user retention data
            };
        } catch (error) {
            logger.error('Error generating revenue metrics:', error);
            throw error;
        }
    }

    /**
     * Generate performance metrics report
     */
    public async generatePerformanceMetrics(
        startDate: Date,
        endDate: Date
    ): Promise<PerformanceMetrics> {
        try {
            const client = clickHouseConnection.getClient();

            const whereClause = `timestamp >= '${startDate.toISOString()}' AND timestamp <= '${endDate.toISOString()}'`;

            // User metrics
            const userMetricsQuery = `
        SELECT 
          count(DISTINCT user_id) as total_users,
          countIf(user_id IS NOT NULL) as active_users,
          countIf(event_name = 'user_registered') as new_users,
          avg(JSONExtractFloat(properties, 'session_duration')) as avg_session_duration,
          count() as total_page_views,
          countIf(event_type = 'page_view') as page_views
        FROM analytics_events
        WHERE ${whereClause}
      `;

            // Previous period for growth calculation
            const previousStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
            const previousEnd = startDate;

            const previousUserMetricsQuery = `
        SELECT count(DISTINCT user_id) as previous_users
        FROM analytics_events
        WHERE timestamp >= '${previousStart.toISOString()}' 
        AND timestamp <= '${previousEnd.toISOString()}'
      `;

            // Bounce rate calculation
            const bounceRateQuery = `
        SELECT 
          countIf(page_views = 1) / count() as bounce_rate
        FROM user_sessions
        WHERE start_time >= '${startDate.toISOString()}' 
        AND start_time <= '${endDate.toISOString()}'
      `;

            const [userResult, previousUserResult, bounceResult] = await Promise.all([
                client.query({ query: userMetricsQuery }),
                client.query({ query: previousUserMetricsQuery }),
                client.query({ query: bounceRateQuery })
            ]);

            const userData = (await userResult.json()).data[0];
            const previousUserData = (await previousUserResult.json()).data[0];
            const bounceData = (await bounceResult.json()).data[0];

            const totalUsers = userData?.total_users || 0;
            const previousUsers = previousUserData?.previous_users || 0;
            const userGrowthRate = previousUsers > 0 ?
                ((totalUsers - previousUsers) / previousUsers) * 100 : 0;

            return {
                totalUsers,
                activeUsers: userData?.active_users || 0,
                newUsers: userData?.new_users || 0,
                userGrowthRate,
                sessionDuration: userData?.avg_session_duration || 0,
                pageViews: userData?.page_views || 0,
                bounceRate: (bounceData?.bounce_rate || 0) * 100,
                retentionRate: 0 // Calculate from user retention analysis
            };
        } catch (error) {
            logger.error('Error generating performance metrics:', error);
            throw error;
        }
    }

    /**
     * Generate conversion funnel analysis
     */
    public async generateConversionFunnel(
        funnelSteps: string[],
        startDate: Date,
        endDate: Date
    ): Promise<ConversionFunnel> {
        try {
            const client = clickHouseConnection.getClient();
            const whereClause = `timestamp >= '${startDate.toISOString()}' AND timestamp <= '${endDate.toISOString()}'`;

            // Get users who completed each step
            const stepQueries = funnelSteps.map((step, index) => `
        SELECT 
          '${step}' as step_name,
          ${index} as step_order,
          count(DISTINCT user_id) as user_count
        FROM analytics_events
        WHERE ${whereClause} AND event_name = '${step}'
      `);

            const funnelQuery = stepQueries.join(' UNION ALL ') + ' ORDER BY step_order';

            const result = await client.query({ query: funnelQuery });
            const data = (await result.json()).data;

            const totalUsers = data[0]?.user_count || 0;
            const steps = data.map((row: any, index: number) => {
                const userCount = row.user_count || 0;
                const conversionRate = totalUsers > 0 ? (userCount / totalUsers) * 100 : 0;
                const dropOffRate = index > 0 ?
                    ((data[index - 1].user_count - userCount) / data[index - 1].user_count) * 100 : 0;

                return {
                    id: uuidv4(),
                    name: row.step_name,
                    eventName: row.step_name,
                    userCount,
                    conversionRate,
                    dropOffRate
                };
            });

            const overallConversionRate = totalUsers > 0 && data.length > 0 ?
                (data[data.length - 1].user_count / totalUsers) * 100 : 0;

            return {
                id: uuidv4(),
                name: `Conversion Funnel ${startDate.toISOString().split('T')[0]}`,
                steps,
                totalUsers,
                conversionRate: overallConversionRate,
                dropOffPoints: steps.filter((step: any) => step.dropOffRate > 20).map((step: any) => ({
                    stepId: step.id,
                    dropOffCount: Math.round((step.dropOffRate / 100) * step.userCount),
                    dropOffRate: step.dropOffRate,
                    reasons: [] // Would be populated from user feedback or analysis
                }))
            };
        } catch (error) {
            logger.error('Error generating conversion funnel:', error);
            throw error;
        }
    }

    /**
     * Get key performance indicators (KPIs)
     */
    public async getKPIs(category?: KPICategory): Promise<KPI[]> {
        try {
            const cacheKey = `kpis:${category || 'all'}`;
            const cached = await redisConnection.getJSON<KPI[]>(cacheKey);

            if (cached) {
                return cached;
            }

            const kpis: KPI[] = [];
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            // Revenue KPIs
            if (!category || category === KPICategory.REVENUE) {
                const currentRevenue = await this.generateRevenueMetrics(thirtyDaysAgo, now);
                const previousRevenue = await this.generateRevenueMetrics(sixtyDaysAgo, thirtyDaysAgo);

                kpis.push({
                    id: uuidv4(),
                    name: 'Total Revenue',
                    category: KPICategory.REVENUE,
                    metric: {
                        name: 'total_revenue',
                        field: 'amount',
                        aggregation: 'sum' as any,
                        format: 'currency' as any
                    },
                    currentValue: currentRevenue.totalRevenue,
                    previousValue: previousRevenue.totalRevenue,
                    change: currentRevenue.totalRevenue - previousRevenue.totalRevenue,
                    changePercentage: currentRevenue.revenueGrowth,
                    trend: currentRevenue.revenueGrowth > 0 ? TrendDirection.UP :
                        currentRevenue.revenueGrowth < 0 ? TrendDirection.DOWN : TrendDirection.STABLE,
                    lastUpdated: now
                });
            }

            // Performance KPIs
            if (!category || category === KPICategory.EFFICIENCY) {
                const currentPerf = await this.generatePerformanceMetrics(thirtyDaysAgo, now);
                const previousPerf = await this.generatePerformanceMetrics(sixtyDaysAgo, thirtyDaysAgo);

                kpis.push({
                    id: uuidv4(),
                    name: 'Active Users',
                    category: KPICategory.EFFICIENCY,
                    metric: {
                        name: 'active_users',
                        field: 'user_id',
                        aggregation: 'unique_count' as any,
                        format: 'number' as any
                    },
                    currentValue: currentPerf.activeUsers,
                    previousValue: previousPerf.activeUsers,
                    change: currentPerf.activeUsers - previousPerf.activeUsers,
                    changePercentage: currentPerf.userGrowthRate,
                    trend: currentPerf.userGrowthRate > 0 ? TrendDirection.UP :
                        currentPerf.userGrowthRate < 0 ? TrendDirection.DOWN : TrendDirection.STABLE,
                    lastUpdated: now
                });
            }

            // Cache for 1 hour
            await redisConnection.setJSON(cacheKey, kpis, 3600);

            return kpis;
        } catch (error) {
            logger.error('Error getting KPIs:', error);
            throw error;
        }
    }

    /**
     * Execute a business report
     */
    public async executeReport(reportId: string): Promise<ReportExecution> {
        try {
            const execution: ReportExecution = {
                id: uuidv4(),
                reportId,
                status: ExecutionStatus.RUNNING,
                startTime: new Date()
            };

            // In a real implementation, this would:
            // 1. Get report configuration
            // 2. Execute the query
            // 3. Generate the report in requested format
            // 4. Store the result
            // 5. Send to recipients if configured

            // Simulate report execution
            await new Promise(resolve => setTimeout(resolve, 1000));

            execution.status = ExecutionStatus.COMPLETED;
            execution.endTime = new Date();
            execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
            execution.rowCount = 1000; // Mock data
            execution.fileSize = 50000; // Mock data

            logger.info(`Report executed: ${reportId}`);
            return execution;
        } catch (error) {
            logger.error(`Error executing report ${reportId}:`, error);
            throw error;
        }
    }

    /**
     * Get dashboard data
     */
    public async getDashboardData(): Promise<any> {
        try {
            const cacheKey = 'dashboard_data';
            const cached = await redisConnection.getJSON(cacheKey);

            if (cached) {
                return cached;
            }

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const [revenueMetrics, performanceMetrics, kpis] = await Promise.all([
                this.generateRevenueMetrics(thirtyDaysAgo, now),
                this.generatePerformanceMetrics(thirtyDaysAgo, now),
                this.getKPIs()
            ]);

            const dashboardData = {
                revenue: revenueMetrics,
                performance: performanceMetrics,
                kpis: kpis.slice(0, 6), // Top 6 KPIs
                lastUpdated: now
            };

            // Cache for 5 minutes
            await redisConnection.setJSON(cacheKey, dashboardData, 300);

            return dashboardData;
        } catch (error) {
            logger.error('Error getting dashboard data:', error);
            throw error;
        }
    }

    /**
     * Initialize scheduled reports
     */
    private initializeScheduledReports(): void {
        // Daily revenue report
        const dailyRevenueTask = cron.schedule('0 9 * * *', async () => {
            try {
                logger.info('Executing daily revenue report');
                // Implementation would execute and send daily revenue report
            } catch (error) {
                logger.error('Error in daily revenue report:', error);
            }
        }, { scheduled: false });

        // Weekly performance report
        const weeklyPerformanceTask = cron.schedule('0 9 * * 1', async () => {
            try {
                logger.info('Executing weekly performance report');
                // Implementation would execute and send weekly performance report
            } catch (error) {
                logger.error('Error in weekly performance report:', error);
            }
        }, { scheduled: false });

        this.scheduledReports.set('daily_revenue', dailyRevenueTask);
        this.scheduledReports.set('weekly_performance', weeklyPerformanceTask);

        // Start scheduled tasks
        dailyRevenueTask.start();
        weeklyPerformanceTask.start();

        logger.info('Scheduled reports initialized');
    }

    /**
     * Stop all scheduled reports
     */
    public stopScheduledReports(): void {
        this.scheduledReports.forEach((task, name) => {
            task.stop();
            logger.info(`Stopped scheduled report: ${name}`);
        });
        this.scheduledReports.clear();
    }
}

export const businessIntelligenceService = new BusinessIntelligenceService();