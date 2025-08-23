import { MessageConsumer, EventHandler } from '../../messaging/consumer';

describe('MessageConsumer', () => {
    const mockHandler: EventHandler = jest.fn().mockResolvedValue(undefined);

    beforeEach(async () => {
        // Reset consumer state
        await MessageConsumer.close();
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await MessageConsumer.close();
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            await expect(MessageConsumer.initialize()).resolves.not.toThrow();
            expect(MessageConsumer.isReady()).toBe(true);
        });
    });

    describe('subscribe', () => {
        it('should throw error if not initialized', async () => {
            await expect(MessageConsumer.subscribe('test-queue', 'user.*', mockHandler))
                .rejects.toThrow('Message consumer not initialized');
        });

        it('should subscribe successfully when initialized', async () => {
            await MessageConsumer.initialize();
            await expect(MessageConsumer.subscribe('test-queue', 'user.*', mockHandler))
                .resolves.not.toThrow();
        });
    });

    describe('unsubscribe', () => {
        it('should unsubscribe successfully', async () => {
            await MessageConsumer.initialize();
            await MessageConsumer.subscribe('test-queue', 'user.*', mockHandler);

            await expect(MessageConsumer.unsubscribe('test-queue', 'user.*'))
                .resolves.not.toThrow();
        });

        it('should handle unsubscribe from non-existent subscription', async () => {
            await MessageConsumer.initialize();

            await expect(MessageConsumer.unsubscribe('non-existent', 'pattern'))
                .resolves.not.toThrow();
        });
    });

    describe('getSubscriptions', () => {
        it('should return empty array when no subscriptions', async () => {
            await MessageConsumer.initialize();
            expect(MessageConsumer.getSubscriptions()).toEqual([]);
        });

        it('should return active subscriptions', async () => {
            await MessageConsumer.initialize();
            await MessageConsumer.subscribe('test-queue', 'user.*', mockHandler);

            const subscriptions = MessageConsumer.getSubscriptions();
            expect(subscriptions).toHaveLength(1);
            expect(subscriptions[0]).toEqual({
                queueName: 'test-queue',
                routingPattern: 'user.*'
            });
        });
    });

    describe('close', () => {
        it('should close connection successfully', async () => {
            await MessageConsumer.initialize();
            await expect(MessageConsumer.close()).resolves.not.toThrow();
            expect(MessageConsumer.isReady()).toBe(false);
        });
    });
});