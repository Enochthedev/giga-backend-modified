import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics({ register });

// HTTP Request Metrics
export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status', 'service'],
    registers: [register]
});

export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'service'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
});

// Database Metrics
export const dbConnectionsActive = new Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections',
    labelNames: ['service', 'database'],
    registers: [register]
});

export const dbConnectionsMax = new Gauge({
    name: 'db_connections_max',
    help: 'Maximum number of database connections',
    labelNames: ['service', 'database'],
    registers: [register]
});

export const dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['service', 'operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
    registers: [register]
});

// Business Metrics
export const paymentTransactionsTotal = new Counter({
    name: 'payment_transactions_total',
    help: 'Total number of payment transactions',
    labelNames: ['status', 'gateway', 'currency'],
    registers: [register]
});

export const userRegistrationsTotal = new Counter({
    name: 'user_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['service', 'method'],
    registers: [register]
});

export const activeSessions = new Gauge({
    name: 'active_sessions',
    help: 'Number of active user sessions',
    labelNames: ['service'],
    registers: [register]
});

export const ordersTotal = new Counter({
    name: 'orders_total',
    help: 'Total number of orders',
    labelNames: ['status', 'service'],
    registers: [register]
});

export const rideBookingsTotal = new Counter({
    name: 'ride_bookings_total',
    help: 'Total number of ride bookings',
    labelNames: ['status', 'service'],
    registers: [register]
});

export const hotelBookingsTotal = new Counter({
    name: 'hotel_bookings_total',
    help: 'Total number of hotel bookings',
    labelNames: ['status', 'service'],
    registers: [register]
});

export const fileUploadsTotal = new Counter({
    name: 'file_uploads_total',
    help: 'Total number of file uploads',
    labelNames: ['status', 'type', 'service'],
    registers: [register]
});

export const searchQueriesTotal = new Counter({
    name: 'search_queries_total',
    help: 'Total number of search queries',
    labelNames: ['service', 'type'],
    registers: [register]
});

export const notificationsSentTotal = new Counter({
    name: 'notifications_sent_total',
    help: 'Total number of notifications sent',
    labelNames: ['channel', 'status', 'service'],
    registers: [register]
});

export const authAttemptsTotal = new Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['status', 'method', 'service'],
    registers: [register]
});

// Queue Metrics
export const queueLength = new Gauge({
    name: 'queue_length',
    help: 'Number of messages in queue',
    labelNames: ['queue', 'service'],
    registers: [register]
});

export const queueProcessingDuration = new Histogram({
    name: 'queue_processing_duration_seconds',
    help: 'Duration of queue message processing in seconds',
    labelNames: ['queue', 'service'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [register]
});

// Export the register for /metrics endpoint
export { register };