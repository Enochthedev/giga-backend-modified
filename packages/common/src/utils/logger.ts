import winston from 'winston';

/**
 * Centralized logging utility for all services
 * Provides structured logging with different levels and formats
 */
export class Logger {
    private static instance: winston.Logger;

    public static getInstance(): winston.Logger {
        if (!Logger.instance) {
            Logger.instance = winston.createLogger({
                level: process.env['LOG_LEVEL'] || 'info',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.errors({ stack: true }),
                    winston.format.json(),
                    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                        return JSON.stringify({
                            timestamp,
                            level,
                            service: service || process.env['SERVICE_NAME'] || 'unknown',
                            message,
                            ...meta
                        });
                    })
                ),
                defaultMeta: {
                    service: process.env['SERVICE_NAME'] || 'giga-service'
                },
                transports: [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            winston.format.colorize(),
                            winston.format.simple()
                        )
                    })
                ]
            });

            // Add file transport in production
            if (process.env['NODE_ENV'] === 'production') {
                Logger.instance.add(new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error'
                }));
                Logger.instance.add(new winston.transports.File({
                    filename: 'logs/combined.log'
                }));
            }
        }

        return Logger.instance;
    }

    public static info(message: string, meta?: any): void {
        Logger.getInstance().info(message, meta);
    }

    public static error(message: string, error?: Error, meta?: any): void {
        Logger.getInstance().error(message, { error: error?.stack, ...meta });
    }

    public static warn(message: string, meta?: any): void {
        Logger.getInstance().warn(message, meta);
    }

    public static debug(message: string, meta?: any): void {
        Logger.getInstance().debug(message, meta);
    }
}