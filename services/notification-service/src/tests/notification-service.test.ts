import { NotificationService } from '../services/notification-service';
import { getTestPool } from './setup';

// Mock the providers to avoid external API calls during tests
jest.mock('../providers/email-provider');
jest.mock('../providers/sms-provider');
jest.mock('../providers/push-provider');

describe('NotificationService', () => {
    let notificationService: NotificationService;

    beforeEach(() => {
        notificationService = new NotificationService();
    });

    describe('sendNotification', () => {
        it('should create a notification with valid data', async () => {
            const request = {
                userId: 'user123',
                type: 'email' as const,
                recipient: 'test@example.com',
                subject: 'Test Subject',
                content: 'Test content'
            };

            // Mock the providers to return success
            const mockEmailProvider = require('../providers/email-provider').EmailProvider;
            mockEmailProvider.prototype.send = jest.fn().mockResolvedValue({
                success: true,
                messageId: 'test-message-id'
            });

            const notification = await notificationService.sendNotification(request);

            expect(notification).toBeDefined();
            expect(notification.userId).toBe(request.userId);
            expect(notification.type).toBe(request.type);
            expect(notification.recipient).toBe(request.recipient);
            expect(notification.subject).toBe(request.subject);
            expect(notification.content).toBe(request.content);
        });

        it('should process template variables correctly', async () => {
            const pool = getTestPool();

            // Insert a test template
            await pool.query(`
        INSERT INTO notification_templates (name, type, subject_template, content_template, variables)
        VALUES ('test_template', 'email', 'Hello {{name}}', 'Welcome {{name}} to {{platform}}!', '["name", "platform"]')
      `);

            const request = {
                userId: 'user123',
                type: 'email' as const,
                recipient: 'test@example.com',
                templateName: 'test_template',
                templateVariables: {
                    name: 'John',
                    platform: 'Giga'
                }
            };

            // Mock the email provider
            const mockEmailProvider = require('../providers/email-provider').EmailProvider;
            mockEmailProvider.prototype.send = jest.fn().mockResolvedValue({
                success: true,
                messageId: 'test-message-id'
            });

            const notification = await notificationService.sendNotification(request);

            expect(notification.subject).toBe('Hello John');
            expect(notification.content).toBe('Welcome John to Giga!');
        });

        it('should respect user preferences', async () => {
            const pool = getTestPool();

            // Insert user preferences with email disabled
            await pool.query(`
        INSERT INTO notification_preferences (user_id, email_enabled)
        VALUES ('user123', false)
      `);

            const request = {
                userId: 'user123',
                type: 'email' as const,
                recipient: 'test@example.com',
                subject: 'Test Subject',
                content: 'Test content'
            };

            await expect(notificationService.sendNotification(request))
                .rejects.toThrow('User has disabled email notifications');
        });
    });

    describe('getUserPreferences', () => {
        it('should create default preferences for new user', async () => {
            const preferences = await notificationService.getUserPreferences('newuser123');

            expect(preferences).toBeDefined();
            expect(preferences.userId).toBe('newuser123');
            expect(preferences.emailEnabled).toBe(true);
            expect(preferences.smsEnabled).toBe(true);
            expect(preferences.pushEnabled).toBe(true);
        });

        it('should return existing preferences', async () => {
            const pool = getTestPool();

            // Insert custom preferences
            await pool.query(`
        INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled)
        VALUES ('existinguser123', false, true)
      `);

            const preferences = await notificationService.getUserPreferences('existinguser123');

            expect(preferences.userId).toBe('existinguser123');
            expect(preferences.emailEnabled).toBe(false);
            expect(preferences.smsEnabled).toBe(true);
        });
    });

    describe('getTemplate', () => {
        it('should return template by name', async () => {
            const pool = getTestPool();

            // Insert a test template
            await pool.query(`
        INSERT INTO notification_templates (name, type, content_template)
        VALUES ('test_template', 'email', 'Test content {{variable}}')
      `);

            const template = await notificationService.getTemplate('test_template');

            expect(template).toBeDefined();
            expect(template?.name).toBe('test_template');
            expect(template?.type).toBe('email');
            expect(template?.contentTemplate).toBe('Test content {{variable}}');
        });

        it('should return null for non-existent template', async () => {
            const template = await notificationService.getTemplate('non_existent');
            expect(template).toBeNull();
        });
    });

    describe('getNotificationHistory', () => {
        it('should return user notification history', async () => {
            const pool = getTestPool();

            // Insert test notifications
            await pool.query(`
        INSERT INTO notifications (user_id, type, channel, recipient, content, status)
        VALUES 
          ('user123', 'email', 'email', 'test@example.com', 'Test 1', 'sent'),
          ('user123', 'sms', 'sms', '+1234567890', 'Test 2', 'delivered'),
          ('otheruser', 'email', 'email', 'other@example.com', 'Test 3', 'sent')
      `);

            const history = await notificationService.getNotificationHistory('user123');

            expect(history).toHaveLength(2);
            expect(history[0].userId).toBe('user123');
            expect(history[1].userId).toBe('user123');
        });

        it('should respect pagination parameters', async () => {
            const pool = getTestPool();

            // Insert multiple notifications
            for (let i = 0; i < 5; i++) {
                await pool.query(`
          INSERT INTO notifications (user_id, type, channel, recipient, content, status)
          VALUES ('user123', 'email', 'email', 'test@example.com', 'Test ${i}', 'sent')
        `);
            }

            const history = await notificationService.getNotificationHistory('user123', 2, 1);

            expect(history).toHaveLength(2);
        });
    });
});