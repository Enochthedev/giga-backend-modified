/**
 * ClickHouse database connection and configuration
 */

// Mock ClickHouse client for development
interface ClickHouseClient {
    query: (options: { query: string }) => Promise<{ json: () => Promise<any> }>;
    insert: (options: { table: string; values: any[]; format: string }) => Promise<void>;
    exec: (options: { query: string }) => Promise<void>;
    close: () => Promise<void>;
}

const createClient = (config: any): ClickHouseClient => ({
    query: async (options) => ({
        json: async () => ({ data: [] })
    }),
    insert: async () => { },
    exec: async () => { },
    close: async () => { }
});
import { logger } from '../utils/logger';

export class ClickHouseConnection {
    private static instance: ClickHouseConnection;
    private client: ClickHouseClient;

    private constructor() {
        this.client = createClient({
            host: process.env.CLICKHOUSE_HOST || 'localhost:8123',
            username: process.env.CLICKHOUSE_USERNAME || 'default',
            password: process.env.CLICKHOUSE_PASSWORD || '',
            database: process.env.CLICKHOUSE_DATABASE || 'analytics',
            clickhouse_settings: {
                async_insert: 1,
                wait_for_async_insert: 0,
            },
        });
    }

    public static getInstance(): ClickHouseConnection {
        if (!ClickHouseConnection.instance) {
            ClickHouseConnection.instance = new ClickHouseConnection();
        }
        return ClickHouseConnection.instance;
    }

    public getClient(): ClickHouseClient {
        return this.client;
    }

    /**
     * Initialize database schema
     */
    public async initializeSchema(): Promise<void> {
        try {
            await this.createAnalyticsEventsTable();
            await this.createABTestEventsTable();
            await this.createRevenueEventsTable();
            await this.createUserSessionsTable();
            logger.info('ClickHouse schema initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize ClickHouse schema:', error);
            throw error;
        }
    }

    /**
     * Create analytics events table
     */
    private async createAnalyticsEventsTable(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id String,
        user_id Nullable(String),
        session_id String,
        event_type String,
        event_name String,
        properties String,
        timestamp DateTime64(3),
        source String,
        user_agent Nullable(String),
        ip_address Nullable(String),
        referrer Nullable(String),
        device_type Nullable(String),
        platform Nullable(String),
        version Nullable(String),
        created_at DateTime64(3) DEFAULT now64()
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (timestamp, event_type, event_name)
      TTL timestamp + INTERVAL 365 DAY
    `;

        await this.client.exec({ query });
    }

    /**
     * Create A/B test events table
     */
    private async createABTestEventsTable(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS ab_test_events (
        id String,
        test_id String,
        variant_id String,
        user_id Nullable(String),
        session_id String,
        event_type String,
        event_name String,
        properties String,
        timestamp DateTime64(3),
        created_at DateTime64(3) DEFAULT now64()
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (timestamp, test_id, variant_id)
      TTL timestamp + INTERVAL 365 DAY
    `;

        await this.client.exec({ query });
    }

    /**
     * Create revenue events table
     */
    private async createRevenueEventsTable(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS revenue_events (
        id String,
        user_id Nullable(String),
        order_id Nullable(String),
        product_id Nullable(String),
        service_type String,
        amount Decimal(10, 2),
        currency String,
        payment_method Nullable(String),
        status String,
        timestamp DateTime64(3),
        properties String,
        created_at DateTime64(3) DEFAULT now64()
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (timestamp, service_type, status)
      TTL timestamp + INTERVAL 1095 DAY
    `;

        await this.client.exec({ query });
    }

    /**
     * Create user sessions table
     */
    private async createUserSessionsTable(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id String,
        user_id Nullable(String),
        start_time DateTime64(3),
        end_time Nullable(DateTime64(3)),
        duration Nullable(UInt32),
        page_views UInt32 DEFAULT 0,
        events_count UInt32 DEFAULT 0,
        source String,
        user_agent Nullable(String),
        ip_address Nullable(String),
        referrer Nullable(String),
        device_type Nullable(String),
        platform Nullable(String),
        created_at DateTime64(3) DEFAULT now64(),
        updated_at DateTime64(3) DEFAULT now64()
      ) ENGINE = ReplacingMergeTree(updated_at)
      PARTITION BY toYYYYMM(start_time)
      ORDER BY (start_time, session_id)
      TTL start_time + INTERVAL 365 DAY
    `;

        await this.client.exec({ query });
    }

    /**
     * Test database connection
     */
    public async testConnection(): Promise<boolean> {
        try {
            const result = await this.client.query({
                query: 'SELECT 1 as test',
            });

            const data = await result.json();
            return data.data.length > 0;
        } catch (error) {
            logger.error('ClickHouse connection test failed:', error);
            return false;
        }
    }

    /**
     * Close database connection
     */
    public async close(): Promise<void> {
        try {
            await this.client.close();
            logger.info('ClickHouse connection closed');
        } catch (error) {
            logger.error('Error closing ClickHouse connection:', error);
        }
    }
}

export const clickHouseConnection = ClickHouseConnection.getInstance();