import sgMail from '@sendgrid/mail';
import { NotificationProvider, EmailNotificationData, ProviderResponse } from '../types/notification.types';

export class EmailProvider implements NotificationProvider {
    constructor() {
        const apiKey = process.env['SENDGRID_API_KEY'];
        if (!apiKey) {
            throw new Error('SENDGRID_API_KEY environment variable is required');
        }
        sgMail.setApiKey(apiKey);
    }

    async send(data: EmailNotificationData): Promise<ProviderResponse> {
        try {
            const msg: any = {
                to: data.to,
                from: process.env['SENDGRID_FROM_EMAIL'] || 'noreply@giga.com',
                subject: data.subject,
                text: data.content,
                html: data.html || data.content,
                ...(data.attachments && { attachments: data.attachments })
            };

            const response = await sgMail.send(msg);

            return {
                success: true,
                messageId: response[0].headers['x-message-id'] as string,
                metadata: {
                    statusCode: response[0].statusCode,
                    headers: response[0].headers
                }
            };
        } catch (error: any) {
            console.error('SendGrid email error:', error);

            return {
                success: false,
                error: error.message || 'Failed to send email',
                metadata: {
                    code: error.code,
                    response: error.response?.body
                }
            };
        }
    }

    async sendBulk(emails: EmailNotificationData[]): Promise<ProviderResponse[]> {
        const results: ProviderResponse[] = [];

        for (const email of emails) {
            const result = await this.send(email);
            results.push(result);
        }

        return results;
    }
}