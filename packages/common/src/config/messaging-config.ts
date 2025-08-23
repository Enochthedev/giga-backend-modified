/**
 * Messaging configuration for RabbitMQ
 */
export interface MessagingConfig {
    url: string;
    exchange: string;
    exchangeType: string;
    reconnectDelay: number;
    maxReconnectAttempts: number;
    prefetchCount: number;
}

/**
 * Default messaging configuration
 */
export const defaultMessagingConfig: MessagingConfig = {
    url: process.env['RABBITMQ_URL'] || 'amqp://localhost:5672',
    exchange: process.env['RABBITMQ_EXCHANGE'] || 'giga.events',
    exchangeType: 'topic',
    reconnectDelay: 5000,
    maxReconnectAttempts: 10,
    prefetchCount: 10
};

/**
 * Get messaging configuration with environment overrides
 */
export function getMessagingConfig(): MessagingConfig {
    return {
        url: process.env['RABBITMQ_URL'] || defaultMessagingConfig.url,
        exchange: process.env['RABBITMQ_EXCHANGE'] || defaultMessagingConfig.exchange,
        exchangeType: process.env['RABBITMQ_EXCHANGE_TYPE'] || defaultMessagingConfig.exchangeType,
        reconnectDelay: parseInt(process.env['RABBITMQ_RECONNECT_DELAY'] || '5000'),
        maxReconnectAttempts: parseInt(process.env['RABBITMQ_MAX_RECONNECT_ATTEMPTS'] || '10'),
        prefetchCount: parseInt(process.env['RABBITMQ_PREFETCH_COUNT'] || '10')
    };
}