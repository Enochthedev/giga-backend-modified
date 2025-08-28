import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Pool } from 'pg';
import * as cron from 'node-cron';
import { DataGovernanceService } from '@giga/common';

/**
 * Data Governance Administration Service
 * Provides centralized administration for data governance across all services
 */
class DataGovernanceAdminService {
    private app: express.Application;
    private dbPool: Pool;
    private governanceService: DataGovernanceService | null = null;
    private port: number;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.DATA_GOVERNANCE_ADMIN_PORT || '3020');

        this.dbPool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/governance'
        });

        this.setupMiddleware();
        this.setupRoutes();
        this.setupScheduledTasks();
    }

    private setupMiddleware(): void {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(compression());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'data-governance-admin',
                timestamp: new Date().toISOString()
            });
        });

        // Compliance validation endpoint
        this.app.get('/api/compliance/validate', async (req, res) => {
            try {
                if (!this.governanceService) {
                    return res.status(503).json({ error: 'Service not initialized' });
                }

                const result = await this.governanceService.validateCompliance();
                res.json(result);
            } catch (error) {
                console.error('Compliance validation error:', error);
                res.status(500).json({ error: 'Failed to validate compliance' });
            }
        });

        // Compliance report endpoint
        this.app.get('/api/compliance/report', async (req, res) => {
            try {
                if (!this.governanceService) {
                    return res.status(503).json({ error: 'Service not initialized' });
                }

                const startDate = req.query.startDate
                    ? new Date(req.query.startDate as string)
                    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                const endDate = req.query.endDate
                    ? new Date(req.query.endDate as string)
                    : new Date();

                const report = await this.governanceService.generateComplianceReport(startDate, endDate);
                res.json(report);
            } catch (error) {
                console.error('Compliance report error:', error);
                res.status(500).json({ error: 'Failed to generate compliance report' });
            }
        });

        // Audit logs query endpoint
        this.app.get('/api/audit/logs', async (req, res) => {
            try {
                if (!this.governanceService) {
                    return res.status(503).json({ error: 'Service not initialized' });
                }

                const auditLogger = this.governanceService.getAuditLogger();
                const filters: any = {
                    limit: parseInt(req.query.limit as string) || 100,
                    offset: parseInt(req.query.offset as string) || 0
                };

                if (req.query.userId) filters.userId = req.query.userId;
                if (req.query.action) filters.action = req.query.action;
                if (req.query.service) filters.service = req.query.service;
                if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
                if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

                const logs = await auditLogger.queryLogs(filters);
                res.json(logs);
            } catch (error) {
                console.error('Audit logs query error:', error);
                res.status(500).json({ error: 'Failed to query audit logs' });
            }
        });

        // Apply retention policies endpoint
        this.app.post('/api/governance/retention/apply', async (req, res) => {
            try {
                if (!this.governanceService) {
                    return res.status(503).json({ error: 'Service not initialized' });
                }

                await this.governanceService.applyRetentionPolicies();
                res.json({ message: 'Retention policies applied successfully' });
            } catch (error) {
                console.error('Retention policies error:', error);
                res.status(500).json({ error: 'Failed to apply retention policies' });
            }
        });

        // GDPR request processing endpoint
        this.app.post('/api/gdpr/request', async (req, res) => {
            try {
                if (!this.governanceService) {
                    return res.status(503).json({ error: 'Service not initialized' });
                }

                const gdprRequest = {
                    id: `gdpr_${Date.now()}`,
                    userId: req.body.userId,
                    requestType: req.body.requestType,
                    status: 'pending',
                    requestedAt: new Date(),
                    requestData: req.body.data
                };

                await this.governanceService.processGDPRRequest(gdprRequest);

                res.json({
                    message: 'GDPR request submitted successfully',
                    requestId: gdprRequest.id,
                    estimatedProcessingTime: '30 days'
                });
            } catch (error) {
                console.error('GDPR request error:', error);
                res.status(500).json({ error: 'Failed to process GDPR request' });
            }
        });

        // Configuration endpoint
        this.app.get('/api/governance/config', async (req, res) => {
            try {
                if (!this.governanceService) {
                    return res.status(503).json({ error: 'Service not initialized' });
                }

                const config = this.governanceService.getConfig();

                // Remove sensitive information
                const safeConfig = {
                    ...config,
                    pci: {
                        ...config.pci,
                        encryptionKey: '[REDACTED]'
                    },
                    anonymization: {
                        ...config.anonymization,
                        defaultSalt: '[REDACTED]'
                    }
                };

                res.json(safeConfig);
            } catch (error) {
                console.error('Config retrieval error:', error);
                res.status(500).json({ error: 'Failed to retrieve configuration' });
            }
        });
    }

    private setupScheduledTasks(): void {
        // Apply retention policies daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                console.log('Running scheduled retention policy application...');
                if (this.governanceService) {
                    await this.governanceService.applyRetentionPolicies();
                    console.log('Retention policies applied successfully');
                }
            } catch (error) {
                console.error('Scheduled retention policy application failed:', error);
            }
        });

        // Generate compliance report weekly on Sundays at 3 AM
        cron.schedule('0 3 * * 0', async () => {
            try {
                console.log('Generating weekly compliance report...');
                if (this.governanceService) {
                    const endDate = new Date();
                    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

                    const report = await this.governanceService.generateComplianceReport(startDate, endDate);
                    console.log('Weekly compliance report generated:', {
                        period: report.period,
                        auditEvents: report.auditCompliance.totalEvents,
                        gdprEnabled: report.gdprCompliance.enabled,
                        pciEnabled: report.pciCompliance?.enabled
                    });
                }
            } catch (error) {
                console.error('Weekly compliance report generation failed:', error);
            }
        });

        // Validate compliance daily at 1 AM
        cron.schedule('0 1 * * *', async () => {
            try {
                console.log('Running daily compliance validation...');
                if (this.governanceService) {
                    const result = await this.governanceService.validateCompliance();
                    if (!result.overall) {
                        console.warn('Compliance issues detected:', {
                            gdprIssues: result.gdpr.issues.length,
                            pciIssues: result.pci.issues.length,
                            auditIssues: result.audit.issues.length,
                            backupIssues: result.backup.issues.length
                        });
                        // In production, send alerts to compliance team
                    } else {
                        console.log('Daily compliance validation passed');
                    }
                }
            } catch (error) {
                console.error('Daily compliance validation failed:', error);
            }
        });
    }

    async initialize(): Promise<void> {
        try {
            console.log('Initializing Data Governance Admin Service...');

            this.governanceService = await DataGovernanceService.initialize(
                this.dbPool,
                'data-governance-admin'
            );

            console.log('Data Governance Admin Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Data Governance Admin Service:', error);
            throw error;
        }
    }

    async start(): Promise<void> {
        await this.initialize();

        this.app.listen(this.port, () => {
            console.log(`Data Governance Admin Service running on port ${this.port}`);
            console.log(`Health check: http://localhost:${this.port}/health`);
            console.log(`API endpoints available at: http://localhost:${this.port}/api`);
        });
    }

    async shutdown(): Promise<void> {
        console.log('Shutting down Data Governance Admin Service...');
        await this.dbPool.end();
        console.log('Data Governance Admin Service shutdown complete');
    }
}

// Start the service
const service = new DataGovernanceAdminService();

service.start().catch(error => {
    console.error('Failed to start Data Governance Admin Service:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    await service.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await service.shutdown();
    process.exit(0);
});

export default DataGovernanceAdminService;