import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    // Log request
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);

    // Override res.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function (...args: any[]): Response {
        const duration = Date.now() - start;
        console.log(
            `${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`
        );
        return originalEnd(...args);
    };

    next();
};