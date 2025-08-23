import axios from 'axios';
import { PaymentRequest, PaymentResponse } from '../types';
import { AppError } from '../middleware/error.middleware';

/**
 * Payment service integration
 */
export class PaymentService {
    private static baseUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3001';
    private static apiKey = process.env.PAYMENT_SERVICE_API_KEY || 'payment-service-api-key';

    /**
     * Process payment through payment service
     */
    public static async processPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/payments/process`,
                paymentData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 seconds timeout
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // Payment service returned an error
                    throw new AppError(
                        error.response.data?.message || 'Payment processing failed',
                        error.response.status
                    );
                } else if (error.request) {
                    // Payment service is unreachable
                    throw new AppError('Payment service is currently unavailable', 503);
                }
            }

            throw new AppError('Payment processing error', 500);
        }
    }

    /**
     * Refund payment
     */
    public static async refundPayment(paymentId: string, amount?: number): Promise<PaymentResponse> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/payments/${paymentId}/refund`,
                { amount },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    throw new AppError(
                        error.response.data?.message || 'Refund processing failed',
                        error.response.status
                    );
                } else if (error.request) {
                    throw new AppError('Payment service is currently unavailable', 503);
                }
            }

            throw new AppError('Refund processing error', 500);
        }
    }

    /**
     * Get payment status
     */
    public static async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/payments/${paymentId}/status`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: 10000
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    throw new AppError(
                        error.response.data?.message || 'Failed to get payment status',
                        error.response.status
                    );
                } else if (error.request) {
                    throw new AppError('Payment service is currently unavailable', 503);
                }
            }

            throw new AppError('Payment status check error', 500);
        }
    }

    /**
     * Validate payment method
     */
    public static async validatePaymentMethod(paymentMethod: string): Promise<boolean> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/payments/validate-method`,
                { paymentMethod },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return response.data.valid === true;
        } catch (error) {
            // If validation fails, assume method is invalid
            return false;
        }
    }

    /**
     * Get supported payment methods
     */
    public static async getSupportedPaymentMethods(): Promise<string[]> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/payments/methods`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    timeout: 10000
                }
            );

            return response.data.methods || [];
        } catch (error) {
            // Return default methods if service is unavailable
            return ['stripe', 'paypal'];
        }
    }
}