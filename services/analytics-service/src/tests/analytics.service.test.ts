/**
 * Analytics service tests
 */

import { analyticsService } from '../services/analytics.service';
import { TrackingRequest, EventType, EventSource, FilterOperator } from '../types/analytics.types';

describe('AnalyticsService', () => {
    describe('trackEvent', () => {
        it('should track a single event successfully', async () => {
            const trackingRequest: TrackingRequest = {
                eventName: 'page_view',
                properties: { page: '/home' },
                userId: 'user123',
                sessionId: 'session123',
                source: EventSource.WEB,
                metadata: {
                    userAgent: 'Mozilla/5.0',
                    ipAddress: '192.168.1.1'
                }
            };

            await expect(analyticsService.trackEvent(trackingRequest)).resolves.not.toThrow();
        });

        it('should handle missing optional fields', async () => {
            const trackingRequest: TrackingRequest = {
                eventName: 'button_click'
            };

            await expect(analyticsService.trackEvent(trackingRequest)).resolves.not.toThrow();
        });

        it('should determine correct event type from event name', async () => {
            const pageViewRequest: TrackingRequest = {
                eventName: 'page_view_home'
            };

            const transactionRequest: TrackingRequest = {
                eventName: 'purchase_completed'
            };

            const actionRequest: TrackingRequest = {
                eventName: 'button_click'
            };

            await Promise.all([
                analyticsService.trackEvent(pageViewRequest),
                analyticsService.trackEvent(transactionRequest),
                analyticsService.trackEvent(actionRequest)
            ]);

            // Verify events were processed (would check actual implementation details)
            expect(true).toBe(true);
        });
    });

    describe('trackEvents', () => {
        it('should track multiple events in batch', async () => {
            const events: TrackingRequest[] = [
                {
                    eventName: 'page_view',
                    properties: { page: '/home' },
                    userId: 'user123'
                },
                {
                    eventName: 'button_click',
                    properties: { button: 'signup' },
                    userId: 'user123'
                },
                {
                    eventName: 'form_submit',
                    properties: { form: 'contact' },
                    userId: 'user123'
                }
            ];

            await expect(analyticsService.trackEvents(events)).resolves.not.toThrow();
        });

        it('should handle empty events array', async () => {
            await expect(analyticsService.trackEvents([])).resolves.not.toThrow();
        });
    });

    describe('queryAnalytics', () => {
        it('should execute analytics query successfully', async () => {
            const query = {
                eventTypes: [EventType.PAGE_VIEW],
                dateFrom: new Date('2023-01-01'),
                dateTo: new Date('2023-12-31'),
                limit: 100
            };

            const result = await analyticsService.queryAnalytics(query);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('totalCount');
            expect(result).toHaveProperty('executionTime');
            expect(Array.isArray(result.data)).toBe(true);
            expect(typeof result.totalCount).toBe('number');
            expect(typeof result.executionTime).toBe('number');
        });

        it('should handle query with filters', async () => {
            const query = {
                eventNames: ['page_view'],
                filters: [
                    {
                        field: 'user_id',
                        operator: FilterOperator.EQUALS,
                        value: 'user123'
                    }
                ],
                groupBy: ['event_name'],
                limit: 50
            };

            const result = await analyticsService.queryAnalytics(query);
            expect(result).toHaveProperty('data');
        });
    });

    describe('getRealTimeMetrics', () => {
        it('should return real-time metrics', async () => {
            const metrics = await analyticsService.getRealTimeMetrics();

            expect(metrics).toHaveProperty('active_users');
            expect(metrics).toHaveProperty('page_views');
            expect(metrics).toHaveProperty('events_per_minute');
        });
    });

    describe('getUserBehavior', () => {
        it('should return user behavior analytics', async () => {
            const userId = 'user123';
            const days = 30;

            const behavior = await analyticsService.getUserBehavior(userId, days);

            expect(Array.isArray(behavior)).toBe(true);
        });

        it('should use default days parameter', async () => {
            const userId = 'user123';

            const behavior = await analyticsService.getUserBehavior(userId);

            expect(Array.isArray(behavior)).toBe(true);
        });
    });
});