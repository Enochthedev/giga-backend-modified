import { Request, Response, NextFunction } from 'express';
import { DataGovernanceService } from '@giga/common';
import { Pool } from 'pg';

/**
 * Data governance middleware for authentication service
 */
export class AuthDataGovernanceMiddleware {
    private static instance: DataGovernanceService | null = null;

    /**
     * Initialize data governance service
     */
    static async initialize(dbPool: Pool): Promise<void> {
        if (!this.instance) {
            this.instance = await DataGovernanceService.initialize(
                dbPool,
                'authentication-service'
            );
        }
    }

    /**
     * Get the data governance service instance
     */
    static getInstance(): DataGovernanceService {
        if (!this.instance) {
            throw new Error('Data governance service not initialized. Call initialize() first.');
        }
        return this.instance;
    }

    /**
     * Middleware to log authentication events
     */
    static logAuthEvents() {
        return async (req: Request, res: Response, next: NextFunction) => {
            if (!this.instance) {
                return next();
            }

            const auditLogger = this.instance.getAuditLogger();
            const originalJson = res.json;

            res.json = function (body: any) {
                // Log authentication events based on the endpoint
                if (req.path.includes('/login')) {
                    const action = res.statusCode === 200 ? 'login' : 'failed_login';

                    setImmediate(async () => {
                        await auditLogger.logAuthentication(
                            body.userId || req.body.email,
                            action as any,
                            'authentication-service',
                            req.ip,
                            req.get('User-Agent'),
                            {
                                endpoint: req.path,
                                statusCode: res.statusCode,
                                email: req.body.email
                            }
                        );
                    });
                } else if (req.path.includes('/logout')) {
                    setImmediate(async () => {
                        await auditLogger.logAuthentication(
                            req.user?.id || req.body.userId,
                            'logout',
                            'authentication-service',
                            req.ip,
                            req.get('User-Agent'),
                            {
                                endpoint: req.path,
                                statusCode: res.statusCode
                            }
                        );
                    });
                } else if (req.path.includes('/register')) {
                    setImmediate(async () => {
                        await auditLogger.logDataModification(
                            undefined, // No user ID yet for registration
                            'user',
                            body.userId || 'new_user',
                            undefined,
                            {
                                email: req.body.email,
                                registrationMethod: req.body.method || 'email'
                            },
                            'authentication-service',
                            req.ip,
                            req.correlationId
                        );
                    });
                }

                return originalJson.call(this, body);
            };

            next();
        };
    }

    /**
     * Middleware to anonymize sensitive user data in responses
     */
    static anonymizeSensitiveData() {
        return async (req: Request, res: Response, next: NextFunction) => {
            if (!this.instance) {
                return next();
            }

            const anonymizationService = this.instance.getAnonymizationService();
            const originalJson = res.json;

            res.json = function (body: any) {
                // Only anonymize for non-owner requests
                const isOwner = req.user?.id === body.id;
                const isAdmin = req.user?.roles?.includes('admin');

                if (!isOwner && !isAdmin && body && typeof body === 'object') {
                    // Anonymize sensitive fields
                    const anonymized = anonymizationService.anonymizeData(body, [
                        { field: 'email', method: 'mask', preserveFormat: true },
                        { field: 'phone', method: 'mask', preserveFormat: true },
                        { field: 'address', method: 'randomize', preserveFormat: false },
                        { field: 'dateOfBirth', method: 'remove' },
                        { field: 'ssn', method: 'remove' }
                    ]);

                    return originalJson.call(this, anonymized);
                }

                return originalJson.call(this, body);
            };

            next();
        };
    }

    /**
     * Middleware to handle GDPR data subject requests
     */
    static handleGDPRRequests() {
        return async (req: Request, res: Response, next: NextFunction) => {
            if (!this.instance) {
                return next();
            }

            // Only handle GDPR endpoints
            if (!req.path.includes('/gdpr/')) {
                return next();
            }

            const gdprService = this.instance.getGDPRService();
            const auditLogger = this.instance.getAuditLogger();

            try {
                if (req.method === 'POST' && req.path.includes('/gdpr/request')) {
                    // Process GDPR request
                    const gdprRequest = {
                        id: `gdpr_${Date.now()}`,
                        userId: req.body.userId || req.user?.id,
                        requestType: req.body.requestType,
                        status: 'pending',
                        requestedAt: new Date(),
                        requestData: req.body.data
                    };

                    await gdprService.processDataSubjectRequest(gdprRequest);

                    res.json({
                        message: 'GDPR request submitted successfully',
                        requestId: gdprRequest.id,
                        estimatedProcessingTime: '30 days'
                    });
                    return;
                } else if (req.method === 'GET' && req.path.includes('/gdpr/export')) {
                    // Export user data
                    const userId = req.params.userId || req.user?.id;

                    if (!userId) {
                        res.status(400).json({ error: 'User ID required' });
                        return;
                    }

                    // Log data export request
                    await auditLogger.logDataAccess(
                        req.user?.id,
                        'user_data_export',
                        userId,
                        'authentication-service',
                        req.ip,
                        req.get('User-Agent')
                    );

                    // In a real implementation, collect all user data
                    const userData = {
                        userId,
                        exportedAt: new Date().toISOString(),
                        data: {
                            profile: {
                                // Would fetch actual user data
                                email: 'user@example.com',
                                createdAt: new Date(),
                                lastLogin: new Date()
                            },
                            authHistory: {
                                // Would fetch auth history
                                loginCount: 0,
                                lastIpAddress: req.ip
                            }
                        },
                        format: 'json'
                    };

                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
                    res.json(userData);
                    return;
                }

                next();
            } catch (error) {
                console.error('GDPR request processing error:', error);
                res.status(500).json({ error: 'Failed to process GDPR request' });
            }
        };
    }

    /**
     * Apply data retention policies
     */
    static async applyRetentionPolicies(): Promise<void> {
        if (!this.instance) {
            console.warn('Data governance service not initialized');
            return;
        }

        try {
            await this.instance.applyRetentionPolicies();
            console.log('Data retention policies applied successfully');
        } catch (error) {
            console.error('Failed to apply retention policies:', error);
        }
    }

    /**
     * Generate compliance report
     */
    static async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
        if (!this.instance) {
            throw new Error('Data governance service not initialized');
        }

        return await this.instance.generateComplianceReport(startDate, endDate);
    }
}

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
            user?: {
                id?: string;
                roles?: string[];
                [key: string]: any;
            };
        }
    }
}