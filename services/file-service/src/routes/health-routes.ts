import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '../database/connection';
import { AWSConfig } from '../config/aws-config';

const router = Router();

// Basic health check
router.get('/', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'file-service',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Detailed health check
router.get('/detailed', async (_req: Request, res: Response) => {
    const health = {
        status: 'healthy',
        service: 'file-service',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
            database: 'unknown',
            s3: 'unknown'
        }
    };

    // Check database connection
    try {
        await DatabaseConnection.query('SELECT 1');
        health.checks.database = 'healthy';
    } catch (error) {
        health.checks.database = 'unhealthy';
        health.status = 'unhealthy';
    }

    // Check S3 connection
    try {
        const s3 = AWSConfig.getS3Instance();
        await s3.listBuckets().promise();
        health.checks.s3 = 'healthy';
    } catch (error) {
        health.checks.s3 = 'unhealthy';
        health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Readiness check
router.get('/ready', async (_req: Request, res: Response) => {
    try {
        // Check if all required services are available
        await DatabaseConnection.query('SELECT 1');

        const s3 = AWSConfig.getS3Instance();
        await s3.listBuckets().promise();

        res.json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

// Liveness check
router.get('/live', (_req: Request, res: Response) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

export { router as healthRoutes };