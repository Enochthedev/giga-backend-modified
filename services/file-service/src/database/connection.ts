import { Pool, PoolClient } from 'pg';

export class DatabaseConnection {
    private static pool: Pool;

    static async initialize(): Promise<void> {
        if (!this.pool) {
            const databaseUrl = process.env.DATABASE_URL;
            if (!databaseUrl) {
                throw new Error('DATABASE_URL environment variable is required');
            }

            this.pool = new Pool({
                connectionString: databaseUrl,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Test the connection
            try {
                const client = await this.pool.connect();
                await client.query('SELECT NOW()');
                client.release();
                console.log('Database connection successful');
            } catch (error) {
                console.error('Database connection failed:', error);
                throw error;
            }

            // Run migrations
            await this.runMigrations();
        }
    }

    static async getClient(): Promise<PoolClient> {
        if (!this.pool) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.pool.connect();
    }

    static async query(text: string, params?: any[]): Promise<any> {
        if (!this.pool) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.pool.query(text, params);
    }

    static async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
        }
    }

    private static async runMigrations(): Promise<void> {
        const createFilesTable = `
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_name VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL,
        category VARCHAR(50) NOT NULL,
        s3_key VARCHAR(500) NOT NULL,
        s3_url TEXT NOT NULL,
        cdn_url TEXT,
        uploaded_by VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_processed BOOLEAN DEFAULT FALSE,
        processing_status VARCHAR(50),
        processing_error TEXT,
        metadata JSONB,
        tags TEXT[],
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

        const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
      CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
      CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at);
      CREATE INDEX IF NOT EXISTS idx_files_tags ON files USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_files_metadata ON files USING GIN(metadata);
    `;

        try {
            await this.query(createFilesTable);
            await this.query(createIndexes);
            console.log('Database migrations completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
}