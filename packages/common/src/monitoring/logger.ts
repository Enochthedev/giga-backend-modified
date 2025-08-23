import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

interface LogContext {
    correlationId?: string;
    userId?: string;
    service: string;
    method?: string;
    url?: string;
    statusCode?: number;
    duration?: number;
    error?: Error;
    [key: string]: any;
}

class Logger {
    private logger: winston.Logger;
    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;

        const transports: winston.transport[] = [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.errors({ stack: true }),
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        return `${timestamp} [${level}] ${this.serviceName}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                            }`;
                    })
                )
            }),

            new winston.transports.File({
                filename: `logs/${serviceName}-error.log`,
                level: 'error',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.errors({ stack: true }),
                    winston.format.json()
                )
            }),

            new winston.transports.File({
                filename: `logs/${serviceName}-combined.log`,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.errors({ stack: true }),
                    winston.format.json()
                )
            })
        ];

        // Add Elasticsearch transport if configured
        if (process.env.ELASTICSEARCH_URL) {
            transports.push(
                new ElasticsearchTransport({
                    level: 'info',
                    clientOpts: {
                        node: process.env.ELASTICSEARCH_URL,
                    },
                    index: `${serviceName}-logs`,
                    transformer: (logData) => {
                        return {
                            '@timestamp': new Date().toISOString(),
                            service: this.serviceName,
                            level: logData.level,
                            message: logData.message,
                            ...logData.meta
                        };
                    }
                })
            );
        }

        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: serviceName },
            transports
        });
    }

    private formatMessage(message: string, context?: LogContext): [string, object] {
        const meta = {
            service: this.serviceName,
            ...context
        };

        return [message, meta];
    }

    info(message: string, context?: LogContext): void {
        const [msg, meta] = this.formatMessage(message, context);
        this.logger.info(msg, meta);
    }

    error(message: string, context?: LogContext): void {
        const [msg, meta] = this.formatMessage(message, context);
        this.logger.error(msg, meta);
    }

    warn(message: string, context?: LogContext): void {
        const [msg, meta] = this.formatMessage(message, context);
        this.logger.warn(msg, meta);
    }

    debug(message: string, context?: LogContext): void {
        const [msg, meta] = this.formatMessage(message, context);
        this.logger.debug(msg, meta);
    }

    // HTTP request logging
    logRequest(req: any, res: any, duration: number): void {
        const context: LogContext = {
            service: this.serviceName,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            duration,
            correlationId: req.headers['x-correlation-id'],
            userId: req.user?.id,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress
        };

        const level = res.statusCode >= 400 ? 'error' : 'info';
        const message = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`;

        this.logger.log(level, message, context);
    }

    // Database query logging
    logQuery(query: string, duration: number, context?: LogContext): void {
        this.info(`Database query executed in ${duration}ms`, {
            ...context,
            query: query.substring(0, 200), // Truncate long queries
            duration
        });
    }

    // Business event logging
    logBusinessEvent(event: string, data: any, context?: LogContext): void {
        this.info(`Business event: ${event}`, {
            ...context,
            event,
            data
        });
    }

    // Security event logging
    logSecurityEvent(event: string, context?: LogContext): void {
        this.warn(`Security event: ${event}`, {
            ...context,
            event,
            security: true
        });
    }
}

// Factory function to create logger instances
export function createLogger(serviceName: string): Logger {
    return new Logger(serviceName);
}

export { Logger, LogContext };