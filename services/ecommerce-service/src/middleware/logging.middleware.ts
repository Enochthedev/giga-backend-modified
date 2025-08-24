import { Request, Response, NextFunction } from 'express';

/**
 * Logging middleware
 */

export interface LoggedRequest extends Request {
    startTime?: number;
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: LoggedRequest, res: Response, next: NextFunction): void => {
    req.startTime = Date.now();

    const originalSend = res.send;
    res.send = function (body) {
        const duration = Date.now() - (req.startTime || 0);

        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
            method: req.method,
            url: req.path,
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: (req as any).user?.id
        });

        return originalSend.call(this, body);
    };

    next();
};