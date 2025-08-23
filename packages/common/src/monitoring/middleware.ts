import { Request, Response, NextFunction } from 'express';
import { register } from './metrics';
import { Logger } from './logger';
import { TracingService } from './tracing';
import {
    httpRequestsTotal,
    httpRequestDuration,
    activeSessions
} from './metrics';

interface MonitoringMiddlewareConfig {
    logger: Logger;
    tracingService?: TracingService;
    serviceName: string;
}

/**
 * Middleware to expose Prometheus metrics endpoint
 */
export function metricsMiddleware() {
    return async (req: Request, res: Response) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (error) {
            res.status(500).end(error);
        }
    };
}

/**
 * Middleware to track HTTP requests and responses
 */
export function requestTrackingMiddleware(config: MonitoringMiddlewareConfig) {
    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();

        // Add correlation ID if not present
        if (!req.headers['x-correlation-id']) {
            req.headers['x-correlation-id'] = `${config.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Initialize tracing if available
        if (config.tracingService) {
            config.tracingService.traceHttpRequest(req, res, () => { });
        }

        // Override res.end to capture metrics
        const originalEnd = res.end;
        res.end = function (this: any, ...args: any[]) {
            const duration = Date.now() - startTime;
            const route = req.route?.path || req.path || 'unknown';

            // Record metrics
            httpRequestsTotal.inc({
                method: req.method,
                route,
                status: res.statusCode.toString(),
                service: config.serviceName
            });

            httpRequestDuration.observe(
                {
                    method: req.method,
                    route,
                    service: config.serviceName
                },
                duration / 1000
            );

            // Log request
            config.logger.logRequest(req, res, duration);

            // Call original end
            originalEnd.apply(this, args);
        };

        next();
    };
}

/**
 * Middleware for error handling and logging
 */
export function errorHandlingMiddleware(config: MonitoringMiddlewareConfig) {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
        const correlationId = req.headers['x-correlation-id'] as string;

        // Log error with context
        config.logger.error('Unhandled error in request', {
            correlationId,
            error,
            method: req.method,
            url: req.originalUrl || req.url,
            userId: (req as any).user?.id,
            stack: error.stack
        });

        // Record error metric
        httpRequestsTotal.inc({
            method: req.method,
            route: req.route?.path || req.path || 'unknown',
            status: '500',
            service: config.serviceName
        });

        // Add tracing error if available
        if (config.tracingService && (req as any).span) {
            (req as any).span.recordException(error);
        }

        // Send error response
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal Server Error',
                correlationId,
                timestamp: new Date().toISOString()
            });
        }

        next(error);
    };
}

/**
 * Middleware to track active sessions
 */
export function sessionTrackingMiddleware(config: MonitoringMiddlewareConfig) {
    const activeSessionsSet = new Set<string>();

    return (req: Request, res: Response, next: NextFunction) => {
        const sessionId = req.sessionID || req.headers['x-session-id'] as string;

        if (sessionId && !activeSessionsSet.has(sessionId)) {
            activeSessionsSet.add(sessionId);
            activeSessions.inc({ service: config.serviceName });

            // Clean up session on response end
            res.on('finish', () => {
                // In a real implementation, you'd want to track session expiry
                // This is a simplified version
                setTimeout(() => {
                    if (activeSessionsSet.has(sessionId)) {
                        activeSessionsSet.delete(sessionId);
                        activeSessions.dec({ service: config.serviceName });
                    }
                }, 30 * 60 * 1000); // 30 minutes
            });
        }

        next();
    };
}

/**
 * Health check middleware
 */
export function healthCheckMiddleware(config: MonitoringMiddlewareConfig) {
    return (req: Request, res: Response) => {
        const healthStatus = {
            service: config.serviceName,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0'
        };

        config.logger.debug('Health check requested', {
            correlationId: req.headers['x-correlation-id'] as string,
            healthStatus
        });

        res.json(healthStatus);
    };
}

/**
 * Database connection monitoring middleware
 */
export function databaseMonitoringMiddleware(
    getConnectionInfo: () => { active: number; max: number; database: string }
) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const connectionInfo = getConnectionInfo();

            // Update database connection metrics
            const serviceName = (req as any).serviceName || 'unknown';

            // Note: These would be updated by the actual database connection pool
            // This is just an example of how to integrate it

            next();
        } catch (error) {
            // Log error but don't fail the request
            console.error('Failed to update database metrics:', error);
            next();
        }
    };
}

/**
 * Rate limiting with metrics
 */
export function rateLimitingMiddleware(config: MonitoringMiddlewareConfig, options: {
    windowMs: number;
    max: number;
}) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const windowStart = now - options.windowMs;

        // Clean up old entries
        for (const [k, v] of requests.entries()) {
            if (v.resetTime < windowStart) {
                requests.delete(k);
            }
        }

        // Get or create request info
        let requestInfo = requests.get(key);
        if (!requestInfo || requestInfo.resetTime < windowStart) {
            requestInfo = { count: 0, resetTime: now + options.windowMs };
            requests.set(key, requestInfo);
        }

        requestInfo.count++;

        if (requestInfo.count > options.max) {
            config.logger.warn('Rate limit exceeded', {
                correlationId: req.headers['x-correlation-id'] as string,
                ip: req.ip,
                count: requestInfo.count,
                limit: options.max
            });

            res.status(429).json({
                error: 'Too Many Requests',
                retryAfter: Math.ceil((requestInfo.resetTime - now) / 1000)
            });
            return;
        }

        next();
    };
}

export {
    MonitoringMiddlewareConfig
};