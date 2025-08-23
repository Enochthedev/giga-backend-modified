// Metrics
export * from './metrics';

// Logging
export { createLogger, Logger, LogContext } from './logger';

// Tracing
export { createTracingService, TracingService, TracingConfig } from './tracing';

// Middleware
export {
    metricsMiddleware,
    requestTrackingMiddleware,
    errorHandlingMiddleware,
    sessionTrackingMiddleware,
    healthCheckMiddleware,
    databaseMonitoringMiddleware,
    rateLimitingMiddleware,
    MonitoringMiddlewareConfig
} from './middleware';

// Utility function to set up monitoring for a service
export function setupMonitoring(serviceName: string, options?: {
    enableTracing?: boolean;
    jaegerEndpoint?: string;
    logLevel?: string;
}) {
    const logger = createLogger(serviceName);

    let tracingService;
    if (options?.enableTracing !== false) {
        tracingService = createTracingService({
            serviceName,
            jaegerEndpoint: options?.jaegerEndpoint
        });
        tracingService.initialize();
    }

    return {
        logger,
        tracingService,
        config: {
            logger,
            tracingService,
            serviceName
        }
    };
}