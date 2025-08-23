import Joi from 'joi';

export const createPropertySchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(2000).optional(),
    propertyType: Joi.string().valid('hotel', 'apartment', 'house', 'villa', 'resort', 'hostel').required(),
    addressLine1: Joi.string().min(1).max(255).required(),
    addressLine2: Joi.string().max(255).optional(),
    city: Joi.string().min(1).max(100).required(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().min(1).max(100).required(),
    postalCode: Joi.string().max(20).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    cancellationPolicy: Joi.string().max(2000).optional(),
    houseRules: Joi.string().max(2000).optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    images: Joi.array().items(Joi.string().uri()).optional()
});

export const updatePropertySchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(2000).optional(),
    propertyType: Joi.string().valid('hotel', 'apartment', 'house', 'villa', 'resort', 'hostel').optional(),
    addressLine1: Joi.string().min(1).max(255).optional(),
    addressLine2: Joi.string().max(255).optional(),
    city: Joi.string().min(1).max(100).optional(),
    state: Joi.string().max(100).optional(),
    country: Joi.string().min(1).max(100).optional(),
    postalCode: Joi.string().max(20).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    checkInTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    checkOutTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
    cancellationPolicy: Joi.string().max(2000).optional(),
    houseRules: Joi.string().max(2000).optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    images: Joi.array().items(Joi.string().uri()).optional()
});

export const createRoomSchema = Joi.object({
    roomType: Joi.string().min(1).max(100).required(),
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(2000).optional(),
    maxOccupancy: Joi.number().integer().min(1).max(20).required(),
    bedType: Joi.string().max(100).optional(),
    bedCount: Joi.number().integer().min(1).max(10).optional(),
    roomSize: Joi.number().positive().optional(),
    roomSizeUnit: Joi.string().valid('sqm', 'sqft').optional(),
    basePrice: Joi.number().positive().required(),
    currency: Joi.string().length(3).optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    images: Joi.array().items(Joi.string().uri()).optional()
});

export const updateRoomSchema = Joi.object({
    roomType: Joi.string().min(1).max(100).optional(),
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(2000).optional(),
    maxOccupancy: Joi.number().integer().min(1).max(20).optional(),
    bedType: Joi.string().max(100).optional(),
    bedCount: Joi.number().integer().min(1).max(10).optional(),
    roomSize: Joi.number().positive().optional(),
    roomSizeUnit: Joi.string().valid('sqm', 'sqft').optional(),
    basePrice: Joi.number().positive().optional(),
    currency: Joi.string().length(3).optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    images: Joi.array().items(Joi.string().uri()).optional()
});

export const createBookingSchema = Joi.object({
    propertyId: Joi.string().uuid().required(),
    roomId: Joi.string().uuid().required(),
    guestName: Joi.string().min(1).max(255).required(),
    guestEmail: Joi.string().email().required(),
    guestPhone: Joi.string().max(50).optional(),
    checkInDate: Joi.date().iso().min('now').required(),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required(),
    adults: Joi.number().integer().min(1).max(20).required(),
    children: Joi.number().integer().min(0).max(20).optional(),
    specialRequests: Joi.string().max(1000).optional()
});

export const propertySearchSchema = Joi.object({
    city: Joi.string().max(100).optional(),
    country: Joi.string().max(100).optional(),
    propertyType: Joi.string().valid('hotel', 'apartment', 'house', 'villa', 'resort', 'hostel').optional(),
    checkInDate: Joi.date().iso().optional(),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).optional(),
    adults: Joi.number().integer().min(1).max(20).optional(),
    children: Joi.number().integer().min(0).max(20).optional(),
    minPrice: Joi.number().positive().optional(),
    maxPrice: Joi.number().positive().greater(Joi.ref('minPrice')).optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    rating: Joi.number().min(1).max(5).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().positive().max(100).optional(), // max 100km
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
});

export const uuidSchema = Joi.string().uuid().required();

// Review validation schemas
export const createReviewSchema = Joi.object({
    propertyId: Joi.string().uuid().required(),
    bookingId: Joi.string().uuid().optional(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(255).optional(),
    comment: Joi.string().max(2000).optional(),
    cleanlinessRating: Joi.number().integer().min(1).max(5).optional(),
    locationRating: Joi.number().integer().min(1).max(5).optional(),
    serviceRating: Joi.number().integer().min(1).max(5).optional(),
    valueRating: Joi.number().integer().min(1).max(5).optional(),
    images: Joi.array().items(Joi.string().uri()).max(10).optional()
});

export const updateReviewSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().max(255).optional(),
    comment: Joi.string().max(2000).optional(),
    cleanlinessRating: Joi.number().integer().min(1).max(5).optional(),
    locationRating: Joi.number().integer().min(1).max(5).optional(),
    serviceRating: Joi.number().integer().min(1).max(5).optional(),
    valueRating: Joi.number().integer().min(1).max(5).optional(),
    images: Joi.array().items(Joi.string().uri()).max(10).optional()
});

export const ownerResponseSchema = Joi.object({
    response: Joi.string().min(1).max(1000).required()
});

// Validation middleware functions
export const reviewValidation = {
    createReview: createReviewSchema,
    updateReview: updateReviewSchema,
    ownerResponse: ownerResponseSchema
};