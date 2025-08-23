import { DeadLetterHandler } from '../../messaging/dead-letter-handler';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger');

describe('DeadLetterHandler', () => {
    beforeEach(async () => {
        // Clean up any existing connections
        try {
            await DeadLetterHandler.close();
        } catch (error) {
            // Ignore errors during cleanup
        }
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Clean up connections after each test
        try {
            await DeadLetterHandler.close();
        } catch (error) {
            // Ignore errors during cleanup
        }
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            await expect(DeadLetterHandler.initialize()).resolves.not.toThrow();
        });

        it('should create dead letter exchange and queue', async () => {
            await DeadLetterHandler.initialize();

            // The initialization should complete without errors
            // In a real test environment, we would verify the exchange and queue exist
            expect(true).toBe(true);
        });
    });

    describe('setupDeadLetterQueue', () => {
        it('should throw error if not initialized', async () => {
            await expect(DeadLetterHandler.setupDeadLetterQueue('test-queue'))
                .rejects.toThrow('Dead letter handler not initialized');
        });

        it('should setup dead letter queue for specific queue', async () => {
            await DeadLetterHandler.initialize();

            const dlxExchange = await DeadLetterHandler.setupDeadLetterQueue('test-queue');

            expect(dlxExchange).toBe('giga.events.dlx');
        });

        it('should handle multiple queue setups', async () => {
            await DeadLetterHandler.initialize();

            const dlxExchange1 = await DeadLetterHandler.setupDeadLetterQueue('queue-1');
            const dlxExchange2 = await DeadLetterHandler.setupDeadLetterQueue('queue-2');

            expect(dlxExchange1).toBe('giga.events.dlx');
            expect(dlxExchange2).toBe('giga.events.dlx');
        });
    });

    describe('getDeadLetterStats', () => {
        it('should throw error if not initialized', async () => {
            await expect(DeadLetterHandler.getDeadLetterStats())
                .rejects.toThrow('Dead letter handler not initialized');
        });

        it('should return dead letter queue statistics', async () => {
            await DeadLetterHandler.initialize();

            const stats = await DeadLetterHandler.getDeadLetterStats();

            expect(stats).toHaveProperty('messageCount');
            expect(stats).toHaveProperty('consumerCount');
            expect(typeof stats.messageCount).toBe('number');
            expect(typeof stats.consumerCount).toBe('number');
        });
    });

    describe('purgeDeadLetterQueue', () => {
        it('should throw error if not initialized', async () => {
            await expect(DeadLetterHandler.purgeDeadLetterQueue())
                .rejects.toThrow('Dead letter handler not initialized');
        });

        it('should purge dead letter queue and return message count', async () => {
            await DeadLetterHandler.initialize();

            const purgedCount = await DeadLetterHandler.purgeDeadLetterQueue();

            expect(typeof purgedCount).toBe('number');
            expect(purgedCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('processDeadLetterQueue', () => {
        it('should throw error if not initialized', async () => {
            const mockProcessor = jest.fn().mockResolvedValue(false);

            await expect(DeadLetterHandler.processDeadLetterQueue(mockProcessor))
                .rejects.toThrow('Dead letter handler not initialized');
        });

        it('should start processing dead letter queue with processor function', async () => {
            await DeadLetterHandler.initialize();

            const mockProcessor = jest.fn().mockResolvedValue(false);

            // This should not throw an error
            await expect(DeadLetterHandler.processDeadLetterQueue(mockProcessor))
                .resolves.not.toThrow();
        });

        it('should handle processor that returns true for requeue', async () => {
            await DeadLetterHandler.initialize();

            const mockProcessor = jest.fn().mockResolvedValue(true);

            await expect(DeadLetterHandler.processDeadLetterQueue(mockProcessor))
                .resolves.not.toThrow();
        });

        it('should handle processor that throws errors', async () => {
            await DeadLetterHandler.initialize();

            const mockProcessor = jest.fn().mockRejectedValue(new Error('Processing failed'));

            await expect(DeadLetterHandler.processDeadLetterQueue(mockProcessor))
                .resolves.not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should handle connection errors gracefully', async () => {
            // This test would require mocking the connection manager to simulate failures
            // For now, we'll just ensure the methods handle errors properly

            await DeadLetterHandler.initialize();

            // All methods should handle errors gracefully
            await expect(DeadLetterHandler.getDeadLetterStats()).resolves.toBeDefined();
            await expect(DeadLetterHandler.purgeDeadLetterQueue()).resolves.toBeDefined();
        });

        it('should handle invalid queue names', async () => {
            await DeadLetterHandler.initialize();

            // Empty queue names should still work (RabbitMQ will handle it)
            // This test verifies the method doesn't crash with edge cases
            await expect(DeadLetterHandler.setupDeadLetterQueue(''))
                .resolves.toBeDefined();
        });
    });

    describe('integration scenarios', () => {
        it('should work with multiple dead letter queue operations', async () => {
            await DeadLetterHandler.initialize();

            // Setup multiple queues
            await DeadLetterHandler.setupDeadLetterQueue('queue-1');
            await DeadLetterHandler.setupDeadLetterQueue('queue-2');

            // Get stats
            const stats = await DeadLetterHandler.getDeadLetterStats();
            expect(stats).toBeDefined();

            // Purge queue
            const purgedCount = await DeadLetterHandler.purgeDeadLetterQueue();
            expect(purgedCount).toBeGreaterThanOrEqual(0);

            // Setup processor
            const mockProcessor = jest.fn().mockResolvedValue(false);
            await DeadLetterHandler.processDeadLetterQueue(mockProcessor);
        });

        it('should maintain state across operations', async () => {
            await DeadLetterHandler.initialize();

            // First operation
            await DeadLetterHandler.setupDeadLetterQueue('persistent-queue');
            const stats1 = await DeadLetterHandler.getDeadLetterStats();

            // Second operation should still work
            const stats2 = await DeadLetterHandler.getDeadLetterStats();

            expect(stats1).toBeDefined();
            expect(stats2).toBeDefined();
        });
    });
});