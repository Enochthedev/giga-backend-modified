import * as amqp from 'amqplib';
import logger from '../utils/logger';

export interface EventPayload {
    name: string;
    service: string;
    payload: any;
}

export class EventService {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private readonly rabbitmqUrl: string;

    constructor() {
        this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    }

    async connect(): Promise<void> {
        try {
            this.connection = await amqp.connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Ensure the exchange exists
            await this.channel.assertExchange('giga_events', 'topic', { durable: true });

            logger.info('✅ Event service connected to RabbitMQ');
        } catch (error) {
            logger.error('❌ Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }

    async sendEvent(event: EventPayload): Promise<void> {
        if (!this.channel) {
            throw new Error('Event service not connected to RabbitMQ');
        }

        try {
            const message = JSON.stringify(event);
            const routingKey = `${event.service}.${event.name}`;

            await this.channel.publish('giga_events', routingKey, Buffer.from(message), {
                persistent: true,
                timestamp: Date.now()
            });

            logger.info(`📤 Event sent: ${event.name} to ${event.service}`, {
                eventName: event.name,
                targetService: event.service
            });
        } catch (error) {
            logger.error('❌ Failed to send event:', error);
            throw error;
        }
    }

    async consumeEvents(queueName: string, routingKey: string, handler: (event: EventPayload) => Promise<void>): Promise<void> {
        if (!this.channel) {
            throw new Error('Event service not connected to RabbitMQ');
        }

        try {
            // Ensure queue exists
            await this.channel.assertQueue(queueName, { durable: true });

            // Bind queue to exchange with routing key
            await this.channel.bindQueue(queueName, 'giga_events', routingKey);

            // Consume messages
            await this.channel.consume(queueName, async (msg) => {
                if (msg) {
                    try {
                        const event: EventPayload = JSON.parse(msg.content.toString());
                        await handler(event);

                        // Acknowledge message
                        this.channel?.ack(msg);

                        logger.info(`📥 Event processed: ${event.name}`, {
                            eventName: event.name,
                            sourceService: event.service
                        });
                    } catch (error) {
                        logger.error('❌ Error processing event:', error);
                        // Reject message and requeue
                        this.channel?.nack(msg, false, true);
                    }
                }
            });

            logger.info(`🎧 Event consumer started: ${queueName} for ${routingKey}`);
        } catch (error) {
            logger.error('❌ Failed to setup event consumer:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            logger.info('✅ Event service disconnected from RabbitMQ');
        } catch (error) {
            logger.error('❌ Error disconnecting from RabbitMQ:', error);
        }
    }

    // Legacy service compatibility methods
    async sendRideOffer(rideData: any): Promise<any> {
        await this.sendEvent({
            name: 'GetRideOffer',
            service: 'taxi_driver',
            payload: rideData
        });

        // Return mock data for backward compatibility
        return {
            distance: rideData.distance || 5000,
            arrivalEta: 300, // 5 minutes
            rideEta: 900      // 15 minutes
        };
    }

    async sendDriverAcceptRide(rideData: any): Promise<void> {
        await this.sendEvent({
            name: 'DriverAcceptRide',
            service: 'taxi_main',
            payload: rideData
        });
    }

    async sendDriverRejectRide(customerId: string): Promise<void> {
        await this.sendEvent({
            name: 'DriverRejectRide',
            service: 'taxi_main',
            payload: { customerId }
        });
    }

    async sendDriverEndTrip(customerId: string): Promise<void> {
        await this.sendEvent({
            name: 'DriverEndTrip',
            service: 'taxi_main',
            payload: { customerId }
        });
    }

    async sendRatingUpdate(userId: string, rating: number): Promise<void> {
        await this.sendEvent({
            name: 'rateUser',
            service: 'user',
            payload: { userId, rating }
        });
    }

    async sendAccountCreation(accountInfo: any, type: string): Promise<void> {
        await this.sendEvent({
            name: 'createTaxiAccount',
            service: 'user',
            payload: { accountInfo, type }
        });
    }

    async sendPaymentRequest(token: string, amount: number, narration: string): Promise<void> {
        await this.sendEvent({
            name: 'payFee',
            service: 'payment',
            payload: { token, amount, narration }
        });
    }
}

export default new EventService();
