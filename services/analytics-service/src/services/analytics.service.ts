/**
 * Core analytics service for event tracking and querying
 */

import { v4 as uuidv4 } from 'uuid';
import { clickHouseConnection } from '../database/clickhouse-connection';
import { redisConnection } from '../database/redis-connection';
import { logger } from '../utils/logger';
import {
    AnalyticsEvent,
    TrackingRequest,
    AnalyticsQuery,
    AnalyticsResult,
    EventType,
    EventSource,
    AggregationType,
    FilterOperator
} from '../types/analytics.types';

export class AnalyticsService {
    private batchSize: number;
    private flushInterval: number;
    private eventBatch: AnalyticsEvent[] = [];
    private flushTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.batchSize = parseInt(process.env.ANALYTICS_BATCH_SIZE || '1000');
        this.flushInterval = parseInt(process.env.ANALYTICS_FLUSH_INTERVAL || '30000');
        this.startBatchProcessor();
    }

    /**
     * Track a single analytics event
     */
    public async trackEvent(request: TrackingRequest): Promise<void> {
        try {
            const event: AnalyticsEvent = {
                id: uuidv4(),
                userId: request.userId,
                sessionId: request.sessionId || uuidv4(),
                eventType: this.determineEventType(request.eventName),
                eventName: request.eventName,
                properties: request.properties || {},
                timestamp: new Date(),
                source: request.source || EventSource.API,
                metadata: {
                    userAgent: request.metadata?.userAgent,
                    ipAddress: request.metadata?.ipAddress,
                    referrer: request.metadata?.referrer,
                    deviceType: request.metadata?.deviceType,
                    platform: request.metadata?.platform,
                    version: request.metadata?.version
                }
            };

            // Add to batch for processing
            this.eventBatch.push(event);

            // Flush if batch is full
            if (this.eventBatch.length >= this.batchSize) {
                await this.flushEvents();
            }

            // Update session if user provided
            if (event.userId && event.sessionId) {
                await this.updateUserSession(event);
            }

            logger.debug(`Event tracked: ${event.eventName} for user ${event.userId}`);
        } catch (error) {
            logger.error('Error tracking event:', error);
            throw error;
        }
    }

    /**
     * Track multiple events in batch
     */
    public async trackEvents(requests: TrackingRequest[]): Promise<void> {
        try {
            const events = requests.map(request => ({
                id: uuidv4(),
                userId: request.userId,
                sessionId: request.sessionId || uuidv4(),
                eventType: this.determineEventType(request.eventName),
                eventName: request.eventName,
                properties: request.properties || {},
                timestamp: new Date(),
                source: request.source || EventSource.API,
                metadata: {
                    userAgent: request.metadata?.userAgent,
                    ipAddress: request.metadata?.ipAddress,
                    referrer: request.metadata?.referrer,
                    deviceType: request.metadata?.deviceType,
                    platform: request.metadata?.platform,
                    version: request.metadata?.version
                }
            }));

            this.eventBatch.push(...events);

            // Flush if batch is full
            if (this.eventBatch.length >= this.batchSize) {
                await this.flushEvents();
            }

            logger.debug(`Batch of ${events.length} events tracked`);
        } catch (error) {
            logger.error('Error tracking batch events:', error);
            throw error;
        }
    }

    /**
     * Query analytics data
     */
    public async queryAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
        try {
            const startTime = Date.now();

            // Build ClickHouse query
            const sqlQuery = this.buildQuery(query);

            // Check cache first
            const cacheKey = this.generateCacheKey(query);
            const cachedResult = await redisConnection.getJSON<AnalyticsResult>(cacheKey);

            if (cachedResult) {
                logger.debug(`Cache hit for query: ${cacheKey}`);
                return cachedResult;
            }

            // Execute query
            const client = clickHouseConnection.getClient();
            const result = await client.query({ query: sqlQuery });
            const data = await result.json();

            const analyticsResult: AnalyticsResult = {
                data: data.data,
                totalCount: data.data.length,
                executionTime: Date.now() - startTime
            };

            // Cache result for 5 minutes
            await redisConnection.setJSON(cacheKey, analyticsResult, 300);

            logger.debug(`Query executed in ${analyticsResult.executionTime}ms`);
            return analyticsResult;
        } catch (error) {
            logger.error('Error querying analytics:', error);
            throw error;
        }
    }

    /**
     * Get real-time metrics
     */
    public async getRealTimeMetrics(): Promise<Record<string, any>> {
        try {
            const cacheKey = 'realtime_metrics';
            const cached = await redisConnection.getJSON(cacheKey);

            if (cached) {
                return cached;
            }

            const client = clickHouseConnection.getClient();

            // Get metrics for last hour
            const queries = [
                {
                    name: 'active_users',
                    query: `
            SELECT uniq(user_id) as count
            FROM analytics_events
            WHERE timestamp >= now() - INTERVAL 1 HOUR
            AND user_id IS NOT NULL
          `
                },
                {
                    name: 'page_views',
                    query: `
            SELECT count() as count
            FROM analytics_events
            WHERE timestamp >= now() - INTERVAL 1 HOUR
            AND event_type = 'page_view'
          `
                },
                {
                    name: 'events_per_minute',
                    query: `
            SELECT 
              toStartOfMinute(timestamp) as minute,
              count() as count
            FROM analytics_events
            WHERE timestamp >= now() - INTERVAL 1 HOUR
            GROUP BY minute
            ORDER BY minute DESC
            LIMIT 60
          `
                }
            ];

            const metrics: Record<string, any> = {};

            for (const { name, query } of queries) {
                const result = await client.query({ query });
                const data = await result.json();
                metrics[name] = data.data;
            }

            // Cache for 1 minute
            await redisConnection.setJSON(cacheKey, metrics, 60);

            return metrics;
        } catch (error) {
            logger.error('Error getting real-time metrics:', error);
            throw error;
        }
    }

    /**
     * Get user behavior analytics
     */
    public async getUserBehavior(userId: string, days: number = 30): Promise<any> {
        try {
            const client = clickHouseConnection.getClient();

            const query = `
        SELECT 
          event_name,
          count() as event_count,
          uniq(session_id) as sessions,
          avg(JSONExtractFloat(properties, 'duration')) as avg_duration
        FROM analytics_events
        WHERE user_id = '${userId}'
        AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY event_name
        ORDER BY event_count DESC
      `;

            const result = await client.query({ query });
            const data = await result.json();

            return data.data;
        } catch (error) {
            logger.error('Error getting user behavior:', error);
            throw error;
        }
    }

    /**
     * Flush events to ClickHouse
     */
    private async flushEvents(): Promise<void> {
        if (this.eventBatch.length === 0) return;

        try {
            const client = clickHouseConnection.getClient();
            const events = [...this.eventBatch];
            this.eventBatch = [];

            const values = events.map(event => ({
                id: event.id,
                user_id: event.userId || null,
                session_id: event.sessionId,
                event_type: event.eventType,
                event_name: event.eventName,
                properties: JSON.stringify(event.properties),
                timestamp: event.timestamp.toISOString(),
                source: event.source,
                user_agent: event.metadata.userAgent || null,
                ip_address: event.metadata.ipAddress || null,
                referrer: event.metadata.referrer || null,
                device_type: event.metadata.deviceType || null,
                platform: event.metadata.platform || null,
                version: event.metadata.version || null
            }));

            await client.insert({
                table: 'analytics_events',
                values,
                format: 'JSONEachRow'
            });

            logger.debug(`Flushed ${events.length} events to ClickHouse`);
        } catch (error) {
            logger.error('Error flushing events:', error);
            // Re-add events to batch for retry
            this.eventBatch.unshift(...this.eventBatch);
        }
    }

    /**
     * Start batch processor
     */
    private startBatchProcessor(): void {
        this.flushTimer = setInterval(async () => {
            await this.flushEvents();
        }, this.flushInterval);
    }

    /**
     * Stop batch processor
     */
    public stopBatchProcessor(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Determine event type from event name
     */
    private determineEventType(eventName: string): EventType {
        if (eventName.includes('page_view') || eventName.includes('view')) {
            return EventType.PAGE_VIEW;
        }
        if (eventName.includes('purchase') || eventName.includes('payment')) {
            return EventType.TRANSACTION;
        }
        if (eventName.includes('click') || eventName.includes('action')) {
            return EventType.USER_ACTION;
        }
        return EventType.CUSTOM;
    }

    /**
     * Update user session information
     */
    private async updateUserSession(event: AnalyticsEvent): Promise<void> {
        try {
            const client = clickHouseConnection.getClient();

            // Check if session exists
            const checkQuery = `
        SELECT session_id FROM user_sessions 
        WHERE session_id = '${event.sessionId}' 
        LIMIT 1
      `;

            const result = await client.query({ query: checkQuery });
            const data = await result.json();

            if (data.data.length === 0) {
                // Create new session
                await client.insert({
                    table: 'user_sessions',
                    values: [{
                        session_id: event.sessionId,
                        user_id: event.userId,
                        start_time: event.timestamp.toISOString(),
                        page_views: event.eventType === EventType.PAGE_VIEW ? 1 : 0,
                        events_count: 1,
                        source: event.source,
                        user_agent: event.metadata.userAgent,
                        ip_address: event.metadata.ipAddress,
                        referrer: event.metadata.referrer,
                        device_type: event.metadata.deviceType,
                        platform: event.metadata.platform
                    }],
                    format: 'JSONEachRow'
                });
            }
        } catch (error) {
            logger.error('Error updating user session:', error);
        }
    }

    /**
     * Build ClickHouse query from analytics query
     */
    private buildQuery(query: AnalyticsQuery): string {
        let sql = 'SELECT ';

        // Select fields
        if (query.groupBy && query.groupBy.length > 0) {
            sql += query.groupBy.join(', ') + ', ';
        }

        // Aggregations
        if (query.aggregations && query.aggregations.length > 0) {
            const aggs = query.aggregations.map(agg => {
                switch (agg) {
                    case AggregationType.COUNT:
                        return 'count() as count';
                    case AggregationType.UNIQUE:
                        return 'uniq(user_id) as unique_users';
                    default:
                        return 'count() as count';
                }
            });
            sql += aggs.join(', ');
        } else {
            sql += '*';
        }

        sql += ' FROM analytics_events WHERE 1=1';

        // Filters
        if (query.eventTypes && query.eventTypes.length > 0) {
            const types = query.eventTypes.map(t => `'${t}'`).join(',');
            sql += ` AND event_type IN (${types})`;
        }

        if (query.eventNames && query.eventNames.length > 0) {
            const names = query.eventNames.map(n => `'${n}'`).join(',');
            sql += ` AND event_name IN (${names})`;
        }

        if (query.userIds && query.userIds.length > 0) {
            const ids = query.userIds.map(id => `'${id}'`).join(',');
            sql += ` AND user_id IN (${ids})`;
        }

        if (query.dateFrom) {
            sql += ` AND timestamp >= '${query.dateFrom.toISOString()}'`;
        }

        if (query.dateTo) {
            sql += ` AND timestamp <= '${query.dateTo.toISOString()}'`;
        }

        // Group by
        if (query.groupBy && query.groupBy.length > 0) {
            sql += ` GROUP BY ${query.groupBy.join(', ')}`;
        }

        // Limit
        if (query.limit) {
            sql += ` LIMIT ${query.limit}`;
        }

        if (query.offset) {
            sql += ` OFFSET ${query.offset}`;
        }

        return sql;
    }

    /**
     * Generate cache key for query
     */
    private generateCacheKey(query: AnalyticsQuery): string {
        const key = JSON.stringify(query);
        return `analytics_query:${Buffer.from(key).toString('base64')}`;
    }
}

export const analyticsService = new AnalyticsService();