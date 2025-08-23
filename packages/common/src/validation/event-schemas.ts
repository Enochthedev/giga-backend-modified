import { z } from 'zod';

/**
 * Event metadata schema
 */
export const EventMetadataSchema = z.object({
    userId: z.string().optional(),
    correlationId: z.string().uuid(),
    causationId: z.string().uuid().optional(),
    source: z.string().min(1)
});

/**
 * Base domain event schema
 */
export const DomainEventSchema = z.object({
    id: z.string().uuid(),
    type: z.string().min(1),
    aggregateId: z.string().min(1),
    aggregateType: z.string().min(1),
    data: z.any(),
    metadata: EventMetadataSchema,
    timestamp: z.date(),
    version: z.number().int().positive()
});

/**
 * User-related event schemas
 */
export const UserCreatedEventSchema = DomainEventSchema.extend({
    type: z.literal('UserCreated'),
    aggregateType: z.literal('User'),
    data: z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        roles: z.array(z.string()).optional()
    })
});

export const UserUpdatedEventSchema = DomainEventSchema.extend({
    type: z.literal('UserUpdated'),
    aggregateType: z.literal('User'),
    data: z.object({
        email: z.string().email().optional(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        roles: z.array(z.string()).optional()
    })
});

export const UserDeletedEventSchema = DomainEventSchema.extend({
    type: z.literal('UserDeleted'),
    aggregateType: z.literal('User'),
    data: z.object({
        reason: z.string().optional()
    })
});

/**
 * Payment-related event schemas
 */
export const PaymentProcessedEventSchema = DomainEventSchema.extend({
    type: z.literal('PaymentProcessed'),
    aggregateType: z.literal('Payment'),
    data: z.object({
        amount: z.number().positive(),
        currency: z.string().length(3),
        paymentMethodId: z.string(),
        status: z.enum(['succeeded', 'failed', 'pending']),
        transactionId: z.string(),
        customerId: z.string()
    })
});

export const PaymentFailedEventSchema = DomainEventSchema.extend({
    type: z.literal('PaymentFailed'),
    aggregateType: z.literal('Payment'),
    data: z.object({
        amount: z.number().positive(),
        currency: z.string().length(3),
        paymentMethodId: z.string(),
        errorCode: z.string(),
        errorMessage: z.string(),
        customerId: z.string()
    })
});

export const RefundProcessedEventSchema = DomainEventSchema.extend({
    type: z.literal('RefundProcessed'),
    aggregateType: z.literal('Payment'),
    data: z.object({
        originalPaymentId: z.string(),
        amount: z.number().positive(),
        currency: z.string().length(3),
        reason: z.string(),
        refundId: z.string()
    })
});

/**
 * Order-related event schemas
 */
export const OrderCreatedEventSchema = DomainEventSchema.extend({
    type: z.literal('OrderCreated'),
    aggregateType: z.literal('Order'),
    data: z.object({
        customerId: z.string(),
        items: z.array(z.object({
            productId: z.string(),
            quantity: z.number().int().positive(),
            price: z.number().positive()
        })),
        totalAmount: z.number().positive(),
        currency: z.string().length(3),
        shippingAddress: z.object({
            street: z.string(),
            city: z.string(),
            state: z.string(),
            zipCode: z.string(),
            country: z.string()
        })
    })
});

export const OrderUpdatedEventSchema = DomainEventSchema.extend({
    type: z.literal('OrderUpdated'),
    aggregateType: z.literal('Order'),
    data: z.object({
        status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
        trackingNumber: z.string().optional(),
        estimatedDelivery: z.date().optional()
    })
});

/**
 * Inventory-related event schemas
 */
export const InventoryUpdatedEventSchema = DomainEventSchema.extend({
    type: z.literal('InventoryUpdated'),
    aggregateType: z.literal('Product'),
    data: z.object({
        productId: z.string(),
        previousQuantity: z.number().int().nonnegative(),
        newQuantity: z.number().int().nonnegative(),
        reason: z.enum(['sale', 'restock', 'adjustment', 'return'])
    })
});

export const ProductUpdatedEventSchema = DomainEventSchema.extend({
    type: z.literal('ProductUpdated'),
    aggregateType: z.literal('Product'),
    data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.number().positive().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional()
    })
});

/**
 * Ride-related event schemas
 */
export const RideRequestedEventSchema = DomainEventSchema.extend({
    type: z.literal('RideRequested'),
    aggregateType: z.literal('Ride'),
    data: z.object({
        passengerId: z.string(),
        pickupLocation: z.object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string()
        }),
        destination: z.object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string()
        }),
        rideType: z.enum(['standard', 'premium', 'shared']),
        estimatedFare: z.number().positive()
    })
});

export const RideAcceptedEventSchema = DomainEventSchema.extend({
    type: z.literal('RideAccepted'),
    aggregateType: z.literal('Ride'),
    data: z.object({
        driverId: z.string(),
        vehicleInfo: z.object({
            make: z.string(),
            model: z.string(),
            licensePlate: z.string(),
            color: z.string()
        }),
        estimatedArrival: z.date()
    })
});

export const RideCompletedEventSchema = DomainEventSchema.extend({
    type: z.literal('RideCompleted'),
    aggregateType: z.literal('Ride'),
    data: z.object({
        startTime: z.date(),
        endTime: z.date(),
        distance: z.number().positive(),
        duration: z.number().positive(),
        finalFare: z.number().positive(),
        paymentStatus: z.enum(['pending', 'completed', 'failed'])
    })
});

/**
 * Hotel booking event schemas
 */
export const BookingCreatedEventSchema = DomainEventSchema.extend({
    type: z.literal('BookingCreated'),
    aggregateType: z.literal('Booking'),
    data: z.object({
        guestId: z.string(),
        propertyId: z.string(),
        roomId: z.string(),
        checkInDate: z.date(),
        checkOutDate: z.date(),
        guestCount: z.number().int().positive(),
        totalAmount: z.number().positive(),
        currency: z.string().length(3)
    })
});

export const BookingConfirmedEventSchema = DomainEventSchema.extend({
    type: z.literal('BookingConfirmed'),
    aggregateType: z.literal('Booking'),
    data: z.object({
        confirmationNumber: z.string(),
        paymentStatus: z.enum(['pending', 'completed', 'failed'])
    })
});

export const PropertyUpdatedEventSchema = DomainEventSchema.extend({
    type: z.literal('PropertyUpdated'),
    aggregateType: z.literal('Property'),
    data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        amenities: z.array(z.string()).optional(),
        pricePerNight: z.number().positive().optional(),
        isActive: z.boolean().optional()
    })
});

/**
 * Notification event schemas
 */
export const NotificationSentEventSchema = DomainEventSchema.extend({
    type: z.literal('NotificationSent'),
    aggregateType: z.literal('Notification'),
    data: z.object({
        recipientId: z.string(),
        channel: z.enum(['email', 'sms', 'push']),
        template: z.string(),
        status: z.enum(['sent', 'delivered', 'failed']),
        messageId: z.string().optional()
    })
});

/**
 * Event schema registry
 */
export const EventSchemaRegistry = {
    // User events
    'UserCreated': UserCreatedEventSchema,
    'UserUpdated': UserUpdatedEventSchema,
    'UserDeleted': UserDeletedEventSchema,

    // Payment events
    'PaymentProcessed': PaymentProcessedEventSchema,
    'PaymentFailed': PaymentFailedEventSchema,
    'RefundProcessed': RefundProcessedEventSchema,

    // Order events
    'OrderCreated': OrderCreatedEventSchema,
    'OrderUpdated': OrderUpdatedEventSchema,

    // Inventory events
    'InventoryUpdated': InventoryUpdatedEventSchema,
    'ProductUpdated': ProductUpdatedEventSchema,

    // Ride events
    'RideRequested': RideRequestedEventSchema,
    'RideAccepted': RideAcceptedEventSchema,
    'RideCompleted': RideCompletedEventSchema,

    // Hotel events
    'BookingCreated': BookingCreatedEventSchema,
    'BookingConfirmed': BookingConfirmedEventSchema,
    'PropertyUpdated': PropertyUpdatedEventSchema,

    // Notification events
    'NotificationSent': NotificationSentEventSchema
} as const;

export type EventType = keyof typeof EventSchemaRegistry;