import fs from 'fs';
import path from 'path';
import db from './connection';
import logger from '../utils/logger';

/**
 * Database migration utility for messaging service
 * Reads and executes SQL schema files
 */
class DatabaseMigrator {
    /**
     * Run database migrations
     */
    public async migrate(): Promise<void> {
        try {
            logger.info('Starting database migration...');

            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            await db.query(schema);

            logger.info('Database migration completed successfully');
        } catch (error) {
            logger.error('Database migration failed:', error);
            throw error;
        }
    }

    /**
     * Create initial data for development/testing
     */
    public async seed(): Promise<void> {
        try {
            logger.info('Starting database seeding...');

            // Create default FAQ categories
            await this.createDefaultFAQCategories();

            // Create sample FAQs
            await this.createSampleFAQs();

            logger.info('Database seeding completed successfully');
        } catch (error) {
            logger.error('Database seeding failed:', error);
            throw error;
        }
    }

    /**
     * Create default FAQ categories
     */
    private async createDefaultFAQCategories(): Promise<void> {
        const categories = [
            {
                name: 'General',
                description: 'General questions and information',
                icon: 'info-circle',
                sort_order: 1
            },
            {
                name: 'Account & Profile',
                description: 'Questions about user accounts and profiles',
                icon: 'user',
                sort_order: 2
            },
            {
                name: 'Orders & Payments',
                description: 'Questions about orders, payments, and billing',
                icon: 'credit-card',
                sort_order: 3
            },
            {
                name: 'Products & Services',
                description: 'Questions about products and services',
                icon: 'shopping-bag',
                sort_order: 4
            },
            {
                name: 'Technical Support',
                description: 'Technical issues and troubleshooting',
                icon: 'tools',
                sort_order: 5
            },
            {
                name: 'Vendor Support',
                description: 'Questions for vendors and sellers',
                icon: 'store',
                sort_order: 6
            }
        ];

        for (const category of categories) {
            await db.query(
                `INSERT INTO faq_categories (name, description, icon, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
                [category.name, category.description, category.icon, category.sort_order, true]
            );
        }
    }

    /**
     * Create sample FAQs for development
     */
    private async createSampleFAQs(): Promise<void> {
        // Get category IDs
        const categoriesResult = await db.query('SELECT id, name FROM faq_categories');
        const categories = categoriesResult.rows.reduce((acc: any, row: any) => {
            acc[row.name] = row.id;
            return acc;
        }, {});

        // Create a default admin user for FAQ creation
        const adminResult = await db.query(
            `INSERT INTO users (email, name, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = $2, role = $3
       RETURNING id`,
            ['admin@system.com', 'System Admin', 'admin']
        );
        const adminId = adminResult.rows[0].id;

        const faqs = [
            {
                question: 'How do I create an account?',
                answer: 'To create an account, click on the "Sign Up" button and fill in your details including email, password, and personal information.',
                category: 'Account & Profile',
                tags: ['account', 'registration', 'signup']
            },
            {
                question: 'How can I reset my password?',
                answer: 'Click on "Forgot Password" on the login page, enter your email address, and follow the instructions sent to your email.',
                category: 'Account & Profile',
                tags: ['password', 'reset', 'login']
            },
            {
                question: 'What payment methods do you accept?',
                answer: 'We accept major credit cards (Visa, MasterCard, American Express), PayPal, and various local payment methods depending on your region.',
                category: 'Orders & Payments',
                tags: ['payment', 'credit card', 'paypal']
            },
            {
                question: 'How do I track my order?',
                answer: 'You can track your order by logging into your account and visiting the "My Orders" section, or by using the tracking link sent to your email.',
                category: 'Orders & Payments',
                tags: ['order', 'tracking', 'delivery']
            },
            {
                question: 'How do I contact customer support?',
                answer: 'You can contact our customer support through the chat feature, by creating a support ticket, or by emailing support@example.com.',
                category: 'General',
                tags: ['support', 'contact', 'help']
            },
            {
                question: 'How do I become a vendor?',
                answer: 'To become a vendor, visit our vendor registration page, complete the application form, and wait for approval from our team.',
                category: 'Vendor Support',
                tags: ['vendor', 'seller', 'registration']
            }
        ];

        for (const faq of faqs) {
            await db.query(
                `INSERT INTO faqs (question, answer, category_id, tags, is_published, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
                [
                    faq.question,
                    faq.answer,
                    categories[faq.category],
                    faq.tags,
                    true,
                    adminId
                ]
            );
        }
    }

    /**
     * Drop all tables (use with caution)
     */
    public async dropTables(): Promise<void> {
        try {
            logger.warn('Dropping all tables...');

            const dropQueries = [
                'DROP TABLE IF EXISTS notification_preferences CASCADE',
                'DROP TABLE IF EXISTS ticket_attachments CASCADE',
                'DROP TABLE IF EXISTS tickets CASCADE',
                'DROP TABLE IF EXISTS faqs CASCADE',
                'DROP TABLE IF EXISTS faq_categories CASCADE',
                'DROP TABLE IF EXISTS message_read_receipts CASCADE',
                'DROP TABLE IF EXISTS message_attachments CASCADE',
                'DROP TABLE IF EXISTS messages CASCADE',
                'DROP TABLE IF EXISTS conversation_participants CASCADE',
                'DROP TABLE IF EXISTS conversations CASCADE',
                'DROP TABLE IF EXISTS users CASCADE',
                'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE'
            ];

            for (const query of dropQueries) {
                await db.query(query);
            }

            logger.warn('All tables dropped successfully');
        } catch (error) {
            logger.error('Failed to drop tables:', error);
            throw error;
        }
    }
}

export default new DatabaseMigrator();