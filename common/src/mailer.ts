import nodemailer from 'nodemailer';
import logger from './logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface OTPEmailData {
  to: string;
  otp: string;
  userName?: string;
  type: 'phone' | 'email';
}

export interface VerificationEmailData {
  to: string;
  token: string;
  userName?: string;
}

class MailerService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Check if we have email configuration
      const emailConfig = this.getEmailConfig();
      
      if (!emailConfig) {
        logger.warn('No email configuration found. Email service will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransporter(emailConfig);
      this.isConfigured = true;
      logger.info('Email transporter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.isConfigured = false;
    }
  }

  private getEmailConfig() {
    // Try different email service configurations
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return {
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      };
    }

    if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
      return {
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAILJET_API_KEY,
          pass: process.env.MAILJET_SECRET_KEY,
        },
      };
    }

    if (process.env.SENDGRID_API_KEY) {
      return {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      };
    }

    return null;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.error('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: options.from || process.env.EMAIL_FROM || 'noreply@giga.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}:`, result.messageId);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendOTPEmail(data: OTPEmailData): Promise<boolean> {
    const subject = `Your ${data.type.toUpperCase()} Verification Code`;
    const html = this.generateOTPEmailHTML(data);
    
    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    const subject = 'Verify Your Email Address';
    const html = this.generateVerificationEmailHTML(data);
    
    return this.sendEmail({
      to: data.to,
      subject,
      html,
    });
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const subject = 'Welcome to Giga!';
    const html = this.generateWelcomeEmailHTML(userName);
    
    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  private generateOTPEmailHTML(data: OTPEmailData): string {
    const greeting = data.userName ? `Hello ${data.userName},` : 'Hello,';
    const typeText = data.type === 'phone' ? 'phone number' : 'email address';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-code { font-size: 32px; font-weight: bold; text-align: center; color: #007bff; padding: 20px; background: white; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Giga Verification Code</h1>
          </div>
          <div class="content">
            <p>${greeting}</p>
            <p>Your verification code to verify your ${typeText} is:</p>
            <div class="otp-code">${data.otp}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Giga. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateVerificationEmailHTML(data: VerificationEmailData): string {
    const greeting = data.userName ? `Hello ${data.userName},` : 'Hello,';
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${data.token}&email=${encodeURIComponent(data.to)}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .verify-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>${greeting}</p>
            <p>Thank you for signing up with Giga! Please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>${verificationLink}</p>
            <p>This link will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Giga. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailHTML(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Giga!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Giga!</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Welcome to Giga! We're excited to have you on board.</p>
            <p>Your account has been successfully created and you can now access all our services.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The Giga Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Giga. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  isConfigured(): boolean {
    return this.isConfigured;
  }

  getStatus(): { configured: boolean; provider?: string } {
    if (!this.isConfigured) {
      return { configured: false };
    }

    if (process.env.SMTP_HOST) return { configured: true, provider: 'SMTP' };
    if (process.env.GMAIL_USER) return { configured: true, provider: 'Gmail' };
    if (process.env.MAILJET_API_KEY) return { configured: true, provider: 'Mailjet' };
    if (process.env.SENDGRID_API_KEY) return { configured: true, provider: 'SendGrid' };

    return { configured: true, provider: 'Unknown' };
  }
}

export default new MailerService();
