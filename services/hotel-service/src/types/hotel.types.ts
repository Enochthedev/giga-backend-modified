export interface PropertyOwner {
    id: string;
    userId: string;
    businessName?: string;
    contactEmail: string;
    contactPhone?: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}

export interface Property {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    propertyType: 'hotel' | 'apartment' | 'house' | 'villa' | 'resort' | 'hostel';
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy?: string;
    houseRules?: string;
    amenities: string[];
    images: string[];
    status: 'draft' | 'pending_approval' | 'active' | 'inactive' | 'suspended';
    rating: number;
    reviewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Room {
    id: string;
    propertyId: string;
    roomType: string;
    name: string;
    description?: string;
    maxOccupancy: number;
    bedType?: string;
    bedCount: number;
    roomSize?: number;
    roomSizeUnit: string;
    basePrice: number;
    currency: string;
    amenities: string[];
    images: string[];
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RoomAvailability {
    id: string;
    roomId: string;
    date: Date;
    availableCount: number;
    price?: number;
    minimumStay: number;
    createdAt: Date;
}

export interface Booking {
    id: string;
    propertyId: string;
    roomId: string;
    guestUserId: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    checkInDate: Date;
    checkOutDate: Date;
    adults: number;
    children: number;
    totalNights: number;
    roomRate: number;
    taxes: number;
    fees: number;
    totalAmount: number;
    currency: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    bookingStatus: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
    specialRequests?: string;
    cancellationReason?: string;
    paymentIntentId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PropertyReview {
    id: string;
    propertyId: string;
    bookingId?: string;
    reviewerUserId: string;
    reviewerName: string;
    rating: number;
    title?: string;
    comment?: string;
    cleanlinessRating?: number;
    locationRating?: number;
    serviceRating?: number;
    valueRating?: number;
    images: string[];
    isVerified: boolean;
    ownerResponse?: string;
    ownerResponseDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Request/Response DTOs
export interface CreatePropertyRequest {
    name: string;
    description?: string;
    propertyType: Property['propertyType'];
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    checkInTime?: string;
    checkOutTime?: string;
    cancellationPolicy?: string;
    houseRules?: string;
    amenities?: string[];
    images?: string[];
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> { }

export interface CreateRoomRequest {
    roomType: string;
    name: string;
    description?: string;
    maxOccupancy: number;
    bedType?: string;
    bedCount?: number;
    roomSize?: number;
    roomSizeUnit?: string;
    basePrice: number;
    currency?: string;
    amenities?: string[];
    images?: string[];
}

export interface UpdateRoomRequest extends Partial<CreateRoomRequest> { }

export interface CreateBookingRequest {
    propertyId: string;
    roomId: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children?: number;
    specialRequests?: string;
}

export interface PropertySearchFilters {
    city?: string;
    country?: string;
    propertyType?: Property['propertyType'];
    checkInDate?: string;
    checkOutDate?: string;
    adults?: number;
    children?: number;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
    rating?: number;
    latitude?: number;
    longitude?: number;
    radius?: number; // in kilometers
    page?: number;
    limit?: number;
}

export interface PropertySearchResult extends Property {
    rooms: Room[];
    availableRooms?: Room[];
    minPrice?: number;
    distance?: number;
}