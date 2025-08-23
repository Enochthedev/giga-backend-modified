import { getPool } from './connection';

export const runMigrations = async (): Promise<void> => {
    const pool = getPool();

    try {
        // Create notifications table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push')),
        channel VARCHAR(50) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        content TEXT NOT NULL,
        template_id UUID,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
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

        // Create notification templates table
        await pool.query(`
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

        // Create notification preferences table
        await pool.query(`
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

        // Create delivery logs table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS delivery_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
        provider VARCHAR(100) NOT NULL,
        provider_message_id VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        response_data JSONB DEFAULT '{}',
        error_details TEXT,
        delivered_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

        // Create indexes for better performance
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_delivery_logs_notification_id ON delivery_logs(notification_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_logs_provider ON delivery_logs(provider);
    `);

        // Insert default templates
        await pool.query(`
      INSERT INTO notification_templates (name, type, subject_template, content_template, variables)
      VALUES 
        ('welcome_email', 'email', 'Welcome to {{platform_name}}!', 
         'Hello {{user_name}}, welcome to {{platform_name}}! We''re excited to have you on board.', 
         '["user_name", "platform_name"]'),
        ('order_confirmation', 'email', 'Order Confirmation #{{order_id}}', 
         'Your order #{{order_id}} has been confirmed. Total: {{total_amount}}. Expected delivery: {{delivery_date}}.', 
         '["order_id", "total_amount", "delivery_date"]'),
        ('password_reset', 'email', 'Password Reset Request', 
         'Click the following link to reset your password: {{reset_link}}. This link expires in 1 hour.', 
         '["reset_link"]'),
        ('sms_verification', 'sms', '', 
         'Your verification code is: {{verification_code}}', 
         '["verification_code"]'),
        ('ride_booked', 'push', 'Ride Booked Successfully', 
         'Your ride has been booked. Driver: {{driver_name}}, ETA: {{eta}} minutes.', 
         '["driver_name", "eta"]')
      ON CONFLICT (name) DO NOTHING;
    `);

        console.log('Notification service migrations completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
};