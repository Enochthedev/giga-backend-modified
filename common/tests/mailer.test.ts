import mailer from '../src/mailer';
import { mockCloudinaryResponse, mockEmailResponse } from './utils/testHelpers';

// Mock the logger
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Mailer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.SMTP_HOST;
    delete process.env.GMAIL_USER;
    delete process.env.MAILJET_API_KEY;
    delete process.env.SENDGRID_API_KEY;
  });

  describe('Configuration', () => {
    it('should initialize with SMTP configuration', () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASS = 'test-password';

      // Re-initialize the service
      const newMailer = require('../src/mailer').default;
      expect(newMailer.isConfigured()).toBe(true);
    });

    it('should initialize with Gmail configuration', () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-app-password';

      const newMailer = require('../src/mailer').default;
      expect(newMailer.isConfigured()).toBe(true);
    });

    it('should initialize with Mailjet configuration', () => {
      process.env.MAILJET_API_KEY = 'test-api-key';
      process.env.MAILJET_SECRET_KEY = 'test-secret-key';

      const newMailer = require('../src/mailer').default;
      expect(newMailer.isConfigured()).toBe(true);
    });

    it('should initialize with SendGrid configuration', () => {
      process.env.SENDGRID_API_KEY = 'test-api-key';

      const newMailer = require('../src/mailer').default;
      expect(newMailer.isConfigured()).toBe(true);
    });

    it('should not initialize without configuration', () => {
      const newMailer = require('../src/mailer').default;
      expect(newMailer.isConfigured()).toBe(false);
    });
  });

  describe('Email Sending', () => {
    beforeEach(() => {
      // Set up basic SMTP configuration for testing
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASS = 'test-password';
    });

    it('should send basic email successfully', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await mailer.sendEmail(emailOptions);
      expect(result).toBe(true);
    });

    it('should send email with text fallback', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content',
      };

      const result = await mailer.sendEmail(emailOptions);
      expect(result).toBe(true);
    });

    it('should use custom from address', async () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        from: 'custom@test.com',
      };

      const result = await mailer.sendEmail(emailOptions);
      expect(result).toBe(true);
    });

    it('should fail when service not configured', async () => {
      // Remove configuration
      delete process.env.SMTP_HOST;
      const newMailer = require('../src/mailer').default;

      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await newMailer.sendEmail(emailOptions);
      expect(result).toBe(false);
    });
  });

  describe('OTP Email', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASS = 'test-password';
    });

    it('should send OTP email successfully', async () => {
      const otpData = {
        to: 'test@example.com',
        otp: '123456',
        userName: 'testuser',
        type: 'phone' as const,
      };

      const result = await mailer.sendOTPEmail(otpData);
      expect(result).toBe(true);
    });

    it('should send OTP email without username', async () => {
      const otpData = {
        to: 'test@example.com',
        otp: '123456',
        type: 'phone' as const,
      };

      const result = await mailer.sendOTPEmail(otpData);
      expect(result).toBe(true);
    });

    it('should send OTP email for email verification', async () => {
      const otpData = {
        to: 'test@example.com',
        otp: '123456',
        userName: 'testuser',
        type: 'email' as const,
      };

      const result = await mailer.sendOTPEmail(otpData);
      expect(result).toBe(true);
    });
  });

  describe('Verification Email', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASS = 'test-password';
      process.env.FRONTEND_URL = 'http://localhost:3000';
    });

    it('should send verification email successfully', async () => {
      const verificationData = {
        to: 'test@example.com',
        token: 'verification-token-123',
        userName: 'testuser',
      };

      const result = await mailer.sendVerificationEmail(verificationData);
      expect(result).toBe(true);
    });

    it('should send verification email without username', async () => {
      const verificationData = {
        to: 'test@example.com',
        token: 'verification-token-123',
      };

      const result = await mailer.sendVerificationEmail(verificationData);
      expect(result).toBe(true);
    });

    it('should use default frontend URL when not configured', async () => {
      delete process.env.FRONTEND_URL;
      
      const verificationData = {
        to: 'test@example.com',
        token: 'verification-token-123',
        userName: 'testuser',
      };

      const result = await mailer.sendVerificationEmail(verificationData);
      expect(result).toBe(true);
    });
  });

  describe('Welcome Email', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASS = 'test-password';
    });

    it('should send welcome email successfully', async () => {
      const result = await mailer.sendWelcomeEmail('test@example.com', 'testuser');
      expect(result).toBe(true);
    });
  });

  describe('HTML to Text Conversion', () => {
    it('should convert HTML to plain text', () => {
      const html = '<p>Hello <strong>World</strong>!</p>';
      const text = (mailer as any).htmlToText(html);
      expect(text).toBe('Hello World!');
    });

    it('should handle HTML entities', () => {
      const html = '<p>Hello &amp; World!</p>';
      const text = (mailer as any).htmlToText(html);
      expect(text).toBe('Hello & World!');
    });

    it('should handle complex HTML', () => {
      const html = `
        <div class="container">
          <h1>Title</h1>
          <p>Paragraph with <a href="#">link</a></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      const text = (mailer as any).htmlToText(html);
      expect(text).toContain('Title');
      expect(text).toContain('Paragraph with link');
      expect(text).toContain('Item 1');
      expect(text).toContain('Item 2');
    });
  });

  describe('Service Status', () => {
    it('should return correct status when configured', () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      const newMailer = require('../src/mailer').default;
      
      const status = newMailer.getStatus();
      expect(status.configured).toBe(true);
      expect(status.provider).toBe('SMTP');
    });

    it('should return correct status for Gmail', () => {
      process.env.GMAIL_USER = 'test@gmail.com';
      process.env.GMAIL_APP_PASSWORD = 'test-password';
      const newMailer = require('../src/mailer').default;
      
      const status = newMailer.getStatus();
      expect(status.configured).toBe(true);
      expect(status.provider).toBe('Gmail');
    });

    it('should return correct status for Mailjet', () => {
      process.env.MAILJET_API_KEY = 'test-api-key';
      process.env.MAILJET_SECRET_KEY = 'test-secret-key';
      const newMailer = require('../src/mailer').default;
      
      const status = newMailer.getStatus();
      expect(status.configured).toBe(true);
      expect(status.provider).toBe('Mailjet');
    });

    it('should return correct status for SendGrid', () => {
      process.env.SENDGRID_API_KEY = 'test-api-key';
      const newMailer = require('../src/mailer').default;
      
      const status = newMailer.getStatus();
      expect(status.configured).toBe(true);
      expect(status.provider).toBe('SendGrid');
    });

    it('should return unconfigured status when no provider set', () => {
      const newMailer = require('../src/mailer').default;
      
      const status = newMailer.getStatus();
      expect(status.configured).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle email sending errors gracefully', async () => {
      // Mock transporter to throw error
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP error')),
      };
      
      jest.doMock('nodemailer', () => ({
        createTransporter: jest.fn(() => mockTransporter),
      }));

      const newMailer = require('../src/mailer').default;
      
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await newMailer.sendEmail(emailOptions);
      expect(result).toBe(false);
    });
  });
});
