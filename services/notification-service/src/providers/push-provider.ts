import admin from 'firebase-admin';
import { NotificationProvider, PushNotificationData, ProviderResponse } from '../types/notification.types';

export class PushProvider implements NotificationProvider {
    private messaging: admin.messaging.Messaging;

    constructor() {
        try {
            // Initialize Firebase Admin SDK
            const serviceAccountKey = process.env['FIREBASE_SERVICE_ACCOUNT_KEY'];

            if (!serviceAccountKey || serviceAccountKey.trim() === '') {
                console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not provided, push notifications will be disabled');
                this.messaging = null as any;
                return;
            }

            const serviceAccount = JSON.parse(serviceAccountKey);

            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }

            this.messaging = admin.messaging();
        } catch (error) {
            console.error('Firebase initialization error:', error);
            console.warn('Push notifications will be disabled due to Firebase initialization failure');
            this.messaging = null as any;
        }
    }

    async send(data: PushNotificationData): Promise<ProviderResponse> {
        try {
            if (!this.messaging) {
                return {
                    success: false,
                    error: 'Push notifications are disabled - Firebase not initialized',
                    metadata: {
                        platform: 'firebase',
                        token: data.token,
                        disabled: true
                    }
                };
            }

            const message: admin.messaging.Message = {
                token: data.token,
                notification: {
                    title: data.title,
                    body: data.body,
                    ...(data.imageUrl && { imageUrl: data.imageUrl })
                },
                data: data.data || {},
                android: {
                    notification: {
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                        sound: 'default'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            };

            const messageId = await this.messaging.send(message);

            return {
                success: true,
                messageId,
                metadata: {
                    platform: 'firebase',
                    token: data.token
                }
            };
        } catch (error: any) {
            console.error('Firebase push notification error:', error);

            return {
                success: false,
                error: error.message || 'Failed to send push notification',
                metadata: {
                    code: error.code,
                    errorInfo: error.errorInfo
                }
            };
        }
    }

    async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, any>): Promise<ProviderResponse> {
        try {
            if (!this.messaging) {
                return {
                    success: false,
                    error: 'Push notifications are disabled - Firebase not initialized',
                    metadata: {
                        successCount: 0,
                        failureCount: tokens.length,
                        disabled: true
                    }
                };
            }

            const message: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title,
                    body
                },
                data: data || {},
                android: {
                    notification: {
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                        sound: 'default'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            };

            const response = await this.messaging.sendMulticast(message);

            return {
                success: response.failureCount === 0,
                messageId: `multicast_${Date.now()}`,
                metadata: {
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                    responses: response.responses
                }
            };
        } catch (error: any) {
            console.error('Firebase multicast error:', error);

            return {
                success: false,
                error: error.message || 'Failed to send multicast notification',
                metadata: {
                    code: error.code
                }
            };
        }
    }

    async sendToTopic(topic: string, title: string, body: string, data?: Record<string, any>): Promise<ProviderResponse> {
        try {
            if (!this.messaging) {
                return {
                    success: false,
                    error: 'Push notifications are disabled - Firebase not initialized',
                    metadata: {
                        topic,
                        platform: 'firebase',
                        disabled: true
                    }
                };
            }

            const message: admin.messaging.Message = {
                topic,
                notification: {
                    title,
                    body
                },
                data: data || {},
                android: {
                    notification: {
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                        sound: 'default'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            };

            const messageId = await this.messaging.send(message);

            return {
                success: true,
                messageId,
                metadata: {
                    topic,
                    platform: 'firebase'
                }
            };
        } catch (error: any) {
            console.error('Firebase topic notification error:', error);

            return {
                success: false,
                error: error.message || 'Failed to send topic notification',
                metadata: {
                    code: error.code,
                    topic
                }
            };
        }
    }
}