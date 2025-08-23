import { Pool } from 'pg';

// Test database configuration
const testDbConfig = {
  host: process.env['TEST_DB_HOST'] || 'localhost',
  port: parseInt(process.env['TEST_DB_PORT'] || '5432'),
  database: process.env['TEST_DB_NAME'] || 'notification_test_db',
  user: process.env['TEST_DB_USER'] || 'postgres',
  password: process.env['TEST_DB_PASSWORD'] || 'password',
};

let testPool: Pool;

export const setupTestDatabase = async (): Promise<void> => {
  testPool = new Pool(testDbConfig);

  // Create test tables
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push')),
      channel VARCHAR(50) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      content TEXT NOT NULL,
      template_id UUID,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      metadata JSONB DEFAULT '{}',
      scheduled_at TIMESTAMP WITH TIME ZONE,
      sent_at TIMESTAMP WITH TIME ZONE,
      delivered_at TIMESTAMP WITH TIME ZONE,
      read_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await testPool.query(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push')),
      subject_template VARCHAR(500),
      content_template TEXT NOT NULL,
      variables JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await testPool.query(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL UNIQUE,
      email_enabled BOOLEAN DEFAULT true,
      sms_enabled BOOLEAN DEFAULT true,
      push_enabled BOOLEAN DEFAULT true,
      marketing_emails BOOLEAN DEFAULT false,
      order_updates BOOLEAN DEFAULT true,
      security_alerts BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
};

export const cleanupTestDatabase = async (): Promise<void> => {
  if (testPool) {
    await testPool.query('TRUNCATE notifications, notification_templates, notification_preferences CASCADE');
    await testPool.end();
  }
};

export const getTestPool = (): Pool => testPool;

// Setup and teardown for Jest
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await cleanupTestDatabase();
});

afterEach(async () => {
  // Clean up data after each test
  if (testPool) {
    await testPool.query('TRUNCATE notifications, notification_templates, notification_preferences CASCADE');
  }
});