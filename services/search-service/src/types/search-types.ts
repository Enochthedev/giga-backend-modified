export interface SearchDocument {
    id: string;
    type: 'product' | 'hotel' | 'service';
    title: string;
    description: string;
    category: string;
    tags: string[];
    price?: number;
    currency?: string;
    location?: {
        lat: number;
        lon: number;
        city?: string;
        country?: string;
    };
    rating?: number;
    reviewCount?: number;
    availability?: boolean;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}

export interface ProductDocument extends SearchDocument {
    type: 'product';
    vendorId: string;
    vendorName: string;
    brand?: string;
    sku?: string;
    inStock: boolean;
    stockQuantity?: number;
    attributes?: Record<string, any>;
}

export interface HotelDocument extends SearchDocument {
    type: 'hotel';
    propertyId: string;
    propertyType: 'hotel' | 'apartment' | 'house' | 'room';
    amenities: string[];
    checkInTime?: string;
    checkOutTime?: string;
    maxGuests?: number;
    roomCount?: number;
}

export interface SearchQuery {
    query?: string;
    filters?: SearchFilters;
    sort?: SearchSort;
    pagination?: SearchPagination;
    facets?: string[];
}

export interface SearchFilters {
    type?: string[];
    category?: string[];
    priceRange?: {
        min?: number;
        max?: number;
    };
    location?: {
        center: {
            lat: number;
            lon: number;
        };
        radius: string; // e.g., "10km"
    };
    rating?: {
        min?: number;
        max?: number;
    };
    availability?: boolean;
    tags?: string[];
    attributes?: Record<string, any>;
}

export interface SearchSort {
    field: string;
    order: 'asc' | 'desc';
}

export interface SearchPagination {
    page: number;
    size: number;
}

export interface SearchResult<T = SearchDocument> {
    documents: T[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
    facets?: SearchFacets;
    suggestions?: string[];
    took: number;
}

export interface SearchFacets {
    [key: string]: FacetBucket[];
}

export interface FacetBucket {
    key: string;
    count: number;
}

export interface AutocompleteQuery {
    query: string;
    type?: string;
    limit?: number;
}

export interface AutocompleteResult {
    suggestions: AutocompleteSuggestion[];
    took: number;
}

export interface AutocompleteSuggestion {
    text: string;
    type: string;
    score: number;
    metadata?: Record<string, any>;
}

export interface RecommendationQuery {
    userId?: string;
    itemId?: string;
    type?: string;
    limit?: number;
    algorithm?: 'collaborative' | 'content' | 'hybrid';
}

export interface RecommendationResult {
    recommendations: RecommendationItem[];
    algorithm: string;
    took: number;
}

export interface RecommendationItem {
    id: string;
    type: string;
    title: string;
    score: number;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface UserInteraction {
    userId: string;
    itemId: string;
    itemType: string;
    interactionType: 'view' | 'click' | 'purchase' | 'like' | 'share';
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface IndexingRequest {
    documents: SearchDocument[];
    index: string;
    operation: 'index' | 'update' | 'delete';
}

export interface IndexingResult {
    success: boolean;
    indexed: number;
    errors: IndexingError[];
    took: number;
}

export interface IndexingError {
    documentId: string;
    error: string;
    status: number;
}