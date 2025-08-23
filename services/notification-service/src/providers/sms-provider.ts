import twilio from 'twilio';
import { NotificationProvider, SMSNotificationData, ProviderResponse } from '../types/notification.types';

export class SMSProvider implements NotificationProvider {
    private client: twilio.Twilio;
    private fromNumber: string;

    constructor() {
        const accountSid = process.env['TWILIO_ACCOUNT_SID'];
        const authToken = process.env['TWILIO_AUTH_TOKEN'];
        this.fromNumber = process.env['TWILIO_FROM_NUMBER'] || '';

        if (!accountSid || !authToken || !this.fromNumber) {
            throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) are required');
        }

        this.client = twilio(accountSid, authToken);
    }

    async send(data: SMSNotificationData): Promise<ProviderResponse> {
        try {
            const message = await this.client.messages.create({
                body: data.message,
                from: this.fromNumber,
                to: data.to
            });

            return {
                success: true,
                messageId: message.sid,
                metadata: {
                    status: message.status,
                    direction: message.direction,
                    price: message.price,
                    priceUnit: message.priceUnit
                }
            };
        } catch (error: any) {
            console.error('Twilio SMS error:', error);

            return {
                success: false,
                error: error.message || 'Failed to send SMS',
                metadata: {
                    code: error.code,
                    moreInfo: error.moreInfo,
                    status: error.status
                }
            };
        }
    }

    async sendBulk(messages: SMSNotificationData[]): Promise<ProviderResponse[]> {
        const results: ProviderResponse[] = [];

        for (const message of messages) {
            const result = await this.send(message);
            results.push(result);
        }

        return results;
    }

    async getMessageStatus(messageSid: string): Promise<any> {
        try {
            const message = await this.client.messages(messageSid).fetch();
            return {
                status: message.status,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
                dateUpdated: message.dateUpdated
            };
        } catch (error) {
            console.error('Error fetching message status:', error);
            throw error;
        }
    }
}