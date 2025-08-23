/**
 * Example: How to integrate monitoring into a service
 * 
 * This example shows how to add comprehensive monitoring to any service
 * in the multi-service architecture.
 */

import express from 'express';
import {
    setupMonitoring,
    metricsMiddleware,
    requestTrackingMiddleware,
    errorHandlingMiddleware,
    healthCheckMiddleware,
    paymentTransactionsTotal,
    ordersTotal,
    dbQueryDuration
} from '@giga/common';

// Initialize monitoring for this service
const { logger, tracingService, config } = setupMonitoring('example-service', {
    enableTracing: true,
    jaegerEndpoint: process.env.JAEGER_ENDPOINT
});

const app = express();
const PORT = process.env.PORT || 3000;

// Add monitoring middleware
app.use(express.json());
app.use(requestTrackingMiddleware(config));

// Expose metrics endpoint for Prometheus
app.get('/metrics', metricsMiddleware());

// Health check endpoint
app.get('/health', healthCheckMiddleware(config));

// Example business endpoint with monitoring
app.post('/orders', async (req, res) => {
    const startTime = Date.now();

    try {
        // Log the incoming request
        logger.info('Processing new order', {
            correlationId: req.headers['x-correlation-id'],
            userId: req.body.userId,
            orderData: req.body
        });

        // Trace the order processing
        const order = await tracingService?.traceFunction(
            'process-order',
            async () => {
                // Simulate order processing
                await new Promise(resolve => setTimeout(resolve, 100));

                // Trace database operation
                const orderRecord = await tracingService?.traceDatabaseOperation(
                    'INSERT',
                    'orders',
                    async () => {
                        // Simulate database insert
                        const queryStart = Date.now();
                        await new Promise(resolve => setTimeout(resolve, 50));

                        // Record database query duration
                        dbQueryDuration.observe(
                            {
                                service: 'example-service',
                                operation: 'INSERT',
                                table: 'orders'
                            },
                            (Date.now() - queryStart) / 1000
                        );

                        return { id: 'order_123', status: 'created' };
                    },
                    'INSERT INTO orders (user_id, amount) VALUES ($1, $2)'
                );

                return orderRecord;
            },
            {
                attributes: {
                    'order.user_id': req.body.userId,
                    'order.amount': req.body.amount,
                    'order.currency': req.body.currency
                }
            }
        );

        // Record business metrics
        ordersTotal.inc({
            status: 'created',
            service: 'example-service'
        });

        // Log successful order creation
        logger.info('Order created successfully', {
            correlationId: req.headers['x-correlation-id'],
            orderId: order?.id,
            userId: req.body.userId,
            duration: Date.now() - startTime
        });

        res.status(201).json({
            success: true,
            order: order,
            correlationId: req.headers['x-correlation-id']
        });

    } catch (error) {
        // Log error with context
        logger.error('Failed to create order', {
            correlationId: req.headers['x-correlation-id'],
            error: error,
            userId: req.body.userId,
            duration: Date.now() - startTime
        });

        // Record error metric
        ordersTotal.inc({
            status: 'failed',
            service: 'example-service'
        });

        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            correlationId: req.headers['x-correlation-id']
        });
    }
});

// Example payment endpoint with monitoring
app.post('/payments', async (req, res) => {
    try {
        logger.info('Processing payment', {
            correlationId: req.headers['x-correlation-id'],
            paymentData: {
                amount: req.body.amount,
                currency: req.body.currency,
                gateway: req.body.gateway
            }
        });

        // Trace external payment gateway call
        const paymentResult = await tracingService?.traceExternalCall(
            'payment-gateway',
            'process-payment',
            async () => {
                // Simulate payment processing
                await new Promise(resolve => setTimeout(resolve, 200));

                // Simulate success/failure
                const success = Math.random() > 0.1; // 90% success rate

                if (!success) {
                    throw new Error('Payment gateway error');
                }

                return {
                    id: 'pay_123',
                    status: 'completed',
                    amount: req.body.amount
                };
            },
            `https://api.${req.body.gateway}.com/payments`
        );

        // Record payment metrics
        paymentTransactionsTotal.inc({
            status: 'success',
            gateway: req.body.gateway,
            currency: req.body.currency
        });

        logger.info('Payment processed successfully', {
            correlationId: req.headers['x-correlation-id'],
            paymentId: paymentResult?.id,
            gateway: req.body.gateway
        });

        res.json({
            success: true,
            payment: paymentResult,
            correlationId: req.headers['x-correlation-id']
        });

    } catch (error) {
        // Record failed payment
        paymentTransactionsTotal.inc({
            status: 'failed',
            gateway: req.body.gateway || 'unknown',
            currency: req.body.currency || 'unknown'
        });

        logger.error('Payment processing failed', {
            correlationId: req.headers['x-correlation-id'],
            error: error,
            gateway: req.body.gateway
        });

        res.status(500).json({
            success: false,
            error: 'Payment processing failed',
            correlationId: req.headers['x-correlation-id']
        });
    }
});

// Example endpoint that demonstrates custom metrics
app.get('/analytics', async (req, res) => {
    try {
        // Custom business logic with tracing
        const analytics = await tracingService?.traceFunction(
            'generate-analytics',
            async () => {
                // Simulate analytics generation
                await new Promise(resolve => setTimeout(resolve, 300));

                return {
                    totalOrders: 1250,
                    totalRevenue: 125000,
                    averageOrderValue: 100,
                    timestamp: new Date().toISOString()
                };
            },
            {
                attributes: {
                    'analytics.type': 'summary',
                    'analytics.period': req.query.period as string || 'daily'
                }
            }
        );

        logger.info('Analytics generated', {
            correlationId: req.headers['x-correlation-id'],
            period: req.query.period,
            analytics: analytics
        });

        res.json({
            success: true,
            analytics: analytics,
            correlationId: req.headers['x-correlation-id']
        });

    } catch (error) {
        logger.error('Failed to generate analytics', {
            correlationId: req.headers['x-correlation-id'],
            error: error
        });

        res.status(500).json({
            success: false,
            error: 'Failed to generate analytics',
            correlationId: req.headers['x-correlation-id']
        });
    }
});

// Add error handling middleware (should be last)
app.use(errorHandlingMiddleware(config));

// Start server
app.listen(PORT, () => {
    logger.info(`Example service started on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');

    if (tracingService) {
        await tracingService.shutdown();
    }

    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');

    if (tracingService) {
        await tracingService.shutdown();
    }

    process.exit(0);
});

export default app;