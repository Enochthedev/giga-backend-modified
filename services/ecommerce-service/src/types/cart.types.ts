import { BaseEntity } from './common.types';

/**
 * Shopping cart related types
 */

export interface ShoppingCart extends BaseEntity {
    userId?: string;
    sessionId?: string;
    expiresAt?: Date;
    items: CartItem[];
    subtotal: number;
    itemCount: number;
}

export interface CartItem extends BaseEntity {
    cartId: string;
    productId?: string;
    variantId?: string;
    quantity: number;
    price: number; // Price at time of adding to cart
    product?: {
        id: string;
        name: string;
        sku: string;
        images: Array<{ url: string; alt?: string }>;
        isActive: boolean;
    };
    variant?: {
        id: string;
        name: string;
        sku: string;
        options: Record<string, string>;
        imageUrl?: string;
        isActive: boolean;
    };
}

export interface AddToCartRequest {
    productId?: string;
    variantId?: string;
    quantity: number;
}

export interface UpdateCartItemRequest {
    quantity: number;
}

export interface CartSummary {
    itemCount: number;
    subtotal: number;
    estimatedTax?: number;
    estimatedShipping?: number;
    estimatedTotal?: number;
}

export interface GuestCartSession {
    sessionId: string;
    expiresAt: Date;
}