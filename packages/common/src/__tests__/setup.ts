// Jest setup file for common package tests

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error';

// Mock RabbitMQ connection for tests
jest.mock('amqplib', () => ({
    connect: jest.fn().mockResolvedValue({
        createChannel: jest.fn().mockResolvedValue({
            prefetch: jest.fn(),
            assertExchange: jest.fn(),
            assertQueue: jest.fn(),
            bindQueue: jest.fn(),
            publish: jest.fn().mockReturnValue(true),
            consume: jest.fn().mockResolvedValue({ consumerTag: 'test-consumer' }),
            ack: jest.fn(),
            nack: jest.fn(),
            cancel: jest.fn(),
            close: jest.fn(),
            checkQueue: jest.fn().mockResolvedValue({ messageCount: 0, consumerCount: 0 }),
            purgeQueue: jest.fn().mockResolvedValue({ messageCount: 0 })
        }),
        on: jest.fn(),
        close: jest.fn()
    })
}));

// Global test timeout
jest.setTimeout(10000);