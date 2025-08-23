export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    channel: string;
    recipient: string;
    subject?: string;
    content: string;
    templateId?: string;
    status: NotificationStatus;
    metadata: Record<string, any>;
    scheduledAt?: Date;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    errorMessage?: string;
    retryCount: number;
    maxRetries: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationTemplate {
    id: string;
    name: string;
    type: NotificationType;
    subjectTemplate?: string;
    contentTemplate: string;
    variables: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationPreferences {
    id: string;
    userId: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    marketingEmails: boolean;
    orderUpdates: boolean;
    securityAlerts: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeliveryLog {
    id: string;
    notificationId: string;
    provider: string;
    providerMessageId?: string;
    status: string;
    responseData: Record<string, any>;
    errorDetails?: string;
    deliveredAt?: Date;
    createdAt: Date;
}

export type NotificationType = 'email' | 'sms' | 'push';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';

export interface SendNotificationRequest {
    userId: string;
    type: NotificationType;
    recipient: string;
    subject?: string;
    content?: string;
    templateName?: string;
    templateVariables?: Record<string, any>;
    scheduledAt?: Date;
    metadata?: Record<string, any>;
}

export interface BulkNotificationRequest {
    notifications: SendNotificationRequest[];
}

export interface EmailNotificationData {
    to: string;
    subject: string;
    content: string;
    html?: string;
    attachments?: EmailAttachment[];
}

export interface SMSNotificationData {
    to: string;
    message: string;
}

export interface PushNotificationData {
    token: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    imageUrl?: string;
}

export interface EmailAttachment {
    filename: string;
    content: string;
    type: string;
    disposition: string;
}

export interface NotificationProvider {
    send(data: any): Promise<ProviderResponse>;
}

export interface ProviderResponse {
    success: boolean;
    messageId?: string;
    error?: string;
    metadata?: Record<string, any>;
}