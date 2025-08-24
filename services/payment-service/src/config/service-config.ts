/**
 * Payment service configuration
 */
export interface PaymentServiceConfig {
    port: number;
    environment: string;
    version: string;
    allowedOrigins: string[];
    database: {
        url: string;
        poolSize: number;
    };
    stripe: {
        secretKey: string;
        publicKey: string;
        webhookSecret: string;
    };
    paypal: {
        clientId: string;
        clientSecret: string;
        environment: 'sandbox' | 'production';
    };
    security: {
        jwtSecret: string;
        jwtExpiresIn: string;
    };
    limits: {
        bodyLimit: string;
        requestTimeout: number;
    };
}

/**
 * Get service configuration from environment variables
 */
export function getServiceConfig(): PaymentServiceConfig {
    return {
        port: parseInt(process.env['PORT'] || '4002'),
        environment: process.env['NODE_ENV'] || 'development',
        version: process.env['SERVICE_VERSION'] || '1.0.0',
        allowedOrigins: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],

        database: {
            url: process.env['DATABASE_URL'] || 'postgresql://localhost:5432/payment_service',
            poolSize: parseInt(process.env['DATABASE_POOL_SIZE'] || '10')
        },

        stripe: {
            secretKey: process.env['STRIPE_SECRET_KEY'] || '',
            publicKey: process.env['STRIPE_PUBLIC_KEY'] || '',
            webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] || ''
        },

        paypal: {
            clientId: process.env['PAYPAL_CLIENT_ID'] || '',
            clientSecret: process.env['PAYPAL_CLIENT_SECRET'] || '',
            environment: (process.env['PAYPAL_ENVIRONMENT'] as 'sandbox' | 'production') || 'sandbox'
        },

        security: {
            jwtSecret: process.env['JWT_SECRET'] || 'your-secret-key',
            jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '24h'
        },

        limits: {
            bodyLimit: process.env['BODY_LIMIT'] || '10mb',
            requestTimeout: parseInt(process.env['REQUEST_TIMEOUT'] || '30000')
        }
    };
}

/**
 * Validate required configuration
 */
export function validateConfig(config: PaymentServiceConfig): void {
    const requiredFields = [
        'stripe.secretKey',
        'database.url',
        'security.jwtSecret'
    ];

    for (const field of requiredFields) {
        const value = field.split('.').reduce((obj, key) => obj?.[key], config as any);
        if (!value) {
            throw new Error(`Missing required configuration: ${field}`);
        }
    }
}