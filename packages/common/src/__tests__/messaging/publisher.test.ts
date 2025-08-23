import { MessagePublisher } from '../../messaging/publisher';
import { DomainEvent } from '../../types';

describe('MessagePublisher', () => {
    const mockEvent: DomainEvent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'UserCreated',
        aggregateType: 'User',
        aggregateId: 'user-123',
        data: {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe'
        },
        version: 1,
        timestamp: new Date(),
        metadata: {
            correlationId: '550e8400-e29b-41d4-a716-446655440001',
            source: 'test-service'
        }
    };

    beforeEach(async () => {
        // Reset publisher state
        await MessagePublisher.close();
    });

    afterEach(async () => {
        await MessagePublisher.close();
    });

    describe('initialize', () => {
        it('should initialize successfully', async () => {
            await expect(MessagePublisher.initialize()).resolves.not.toThrow();
            expect(MessagePublisher.isReady()).toBe(true);
        });
    });

    describe('publishEvent', () => {
        it('should throw error if not initialized', async () => {
            await expect(MessagePublisher.publishEvent(mockEvent))
                .rejects.toThrow('Message publisher not initialized');
        });

        it('should publish event successfully when initialized', async () => {
            await MessagePublisher.initialize();
            await expect(MessagePublisher.publishEvent(mockEvent)).resolves.not.toThrow();
        });
    });

    describe('publishEvents', () => {
        it('should publish multiple events successfully', async () => {
            await MessagePublisher.initialize();

            const events = [
                mockEvent,
                { ...mockEvent, id: '550e8400-e29b-41d4-a716-446655440002', aggregateId: 'user-456' }
            ];

            await expect(MessagePublisher.publishEvents(events)).resolves.not.toThrow();
        });
    });

    describe('close', () => {
        it('should close connection successfully', async () => {
            await MessagePublisher.initialize();
            await expect(MessagePublisher.close()).resolves.not.toThrow();
            expect(MessagePublisher.isReady()).toBe(false);
        });
    });
});