import { BaseEntity } from './common.types';

/**
 * Review related types
 */

export interface ProductReview extends BaseEntity {
    productId: string;
    userId: string;
    orderId?: string;
    rating: number;
    title?: string;
    content?: string;
    images: string[];
    isVerified: boolean;
    isApproved: boolean;
    helpfulCount: number;
    user?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export interface CreateReviewRequest {
    productId: string;
    orderId?: string;
    rating: number;
    title?: string;
    content?: string;
    images?: string[];
}

export interface UpdateReviewRequest {
    rating?: number;
    title?: string;
    content?: string;
    images?: string[];
}

export interface ReviewSearchQuery {
    productId?: string;
    userId?: string;
    rating?: number;
    isApproved?: boolean;
    isVerified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'rating' | 'createdAt' | 'helpfulCount';
    sortOrder?: 'asc' | 'desc';
}

export interface ProductRatingStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
}