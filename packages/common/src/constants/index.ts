/**
 * Application-wide constants
 */

// HTTP_STATUS moved to utils/http-status.ts to avoid conflicts

export const EVENTS = {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    ORDER_CREATED: 'order.created',
    ORDER_UPDATED: 'order.updated',
    ORDER_CANCELLED: 'order.cancelled',
    PAYMENT_PROCESSED: 'payment.processed',
    PAYMENT_FAILED: 'payment.failed',
    NOTIFICATION_SENT: 'notification.sent',
    RIDE_REQUESTED: 'ride.requested',
    RIDE_COMPLETED: 'ride.completed',
    BOOKING_CREATED: 'booking.created',
    BOOKING_CANCELLED: 'booking.cancelled'
} as const;

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    USER: 'user',
    VENDOR: 'vendor',
    DRIVER: 'driver',
    PROPERTY_OWNER: 'property_owner'
} as const;

export const PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    UPDATE: 'update',
    DELETE: 'delete',
    ADMIN: 'admin'
} as const;

export const SERVICES = {
    AUTHENTICATION: 'authentication-service',
    API_GATEWAY: 'api-gateway',
    ECOMMERCE: 'ecommerce-service',
    TAXI: 'taxi-service',
    HOTEL: 'hotel-service',
    PAYMENT: 'payment-service',
    NOTIFICATION: 'notification-service',
    SEARCH: 'search-service',
    FILE: 'file-service',
    ANALYTICS: 'analytics-service',
    ADVERTISEMENT: 'advertisement-service'
} as const;

export const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production'
} as const;