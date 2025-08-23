import * as amqp from 'amqplib';
import { Logger } from '../utils/logger';
import { MessagingConfig, getMessagingConfig } from '../config/messaging-config';

/**
 * RabbitMQ connection manager with automatic reconnection
 */
export class ConnectionManager {
    private static instance: ConnectionManager;
    private connection: any = null;
    private channel: any = null;
    private config: MessagingConfig;
    private reconnectAttempts = 0;
    private isConnecting = false;

    private constructor() {
        this.config = getMessagingConfig();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ConnectionManager {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    /**
     * Connect to RabbitMQ
     */
    public async connect(): Promise<void> {
        if (this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        try {
            Logger.info('Connecting to RabbitMQ', { url: this.config.url });

            this.connection = await amqp.connect(this.config.url);
            this.channel = await this.connection.createChannel();

            // Set prefetch count for fair dispatch
            if (this.channel) {
                await this.channel.prefetch(this.config.prefetchCount);

                // Assert exchange
                await this.channel.assertExchange(
                    this.config.exchange,
                    this.config.exchangeType,
                    { durable: true }
                );
            }

            // Setup connection event handlers
            if (this.connection) {
                this.connection.on('error', this.handleConnectionError.bind(this));
                this.connection.on('close', this.handleConnectionClose.bind(this));
            }

            this.reconnectAttempts = 0;
            this.isConnecting = false;

            Logger.info('Successfully connected to RabbitMQ', {
                exchange: this.config.exchange,
                exchangeType: this.config.exchangeType
            });
        } catch (error) {
            this.isConnecting = false;
            Logger.error('Failed to connect to RabbitMQ', error as Error);
            await this.handleReconnect();
            throw error;
        }
    }

    /**
     * Get the current channel
     */
    public getChannel(): any {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available. Call connect() first.');
        }
        return this.channel;
    }

    /**
     * Get the current connection
     */
    public getConnection(): any {
        if (!this.connection) {
            throw new Error('RabbitMQ connection not available. Call connect() first.');
        }
        return this.connection;
    }

    /**
     * Check if connected
     */
    public isConnected(): boolean {
        return this.connection !== null && this.channel !== null;
    }

    /**
     * Close connection
     */
    public async close(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }

            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }

            Logger.info('RabbitMQ connection closed');
        } catch (error) {
            Logger.error('Error closing RabbitMQ connection', error as Error);
        }
    }

    /**
     * Handle connection errors
     */
    private handleConnectionError(error: Error): void {
        Logger.error('RabbitMQ connection error', error);
        this.connection = null;
        this.channel = null;
    }

    /**
     * Handle connection close
     */
    private handleConnectionClose(): void {
        Logger.warn('RabbitMQ connection closed');
        this.connection = null;
        this.channel = null;
        this.handleReconnect();
    }

    /**
     * Handle reconnection logic
     */
    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            Logger.error('Max reconnection attempts reached. Giving up.');
            return;
        }

        this.reconnectAttempts++;
        Logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                Logger.error('Reconnection attempt failed', error as Error);
            }
        }, this.config.reconnectDelay);
    }
}