import { BaseEntity, Dimensions, Image } from './common.types';

/**
 * Product related types
 */

export interface Product extends BaseEntity {
    name: string;
    description?: string;
    shortDescription?: string;
    sku: string;
    price: number;
    comparePrice?: number;
    costPrice?: number;
    categoryId?: string;
    vendorId: string;
    brand?: string;
    weight?: number;
    dimensions?: Dimensions;
    images: Image[];
    tags: string[];
    metaTitle?: string;
    metaDescription?: string;
    isActive: boolean;
    isFeatured: boolean;
    requiresShipping: boolean;
    trackInventory: boolean;
}

export interface ProductVariant extends BaseEntity {
    productId: string;
    sku: string;
    name: string;
    price?: number;
    comparePrice?: number;
    costPrice?: number;
    inventoryQuantity: number;
    weight?: number;
    imageUrl?: string;
    options: Record<string, string>; // e.g., { color: "red", size: "M" }
    isActive: boolean;
}

export interface ProductWithVariants extends Product {
    variants: ProductVariant[];
    category?: {
        id: string;
        name: string;
    };
    inventory?: {
        quantity: number;
        reservedQuantity: number;
        lowStockThreshold: number;
    };
    averageRating?: number;
    reviewCount?: number;
}

export interface CreateProductRequest {
    name: string;
    description?: string;
    shortDescription?: string;
    sku: string;
    price: number;
    comparePrice?: number;
    costPrice?: number;
    categoryId?: string;
    brand?: string;
    weight?: number;
    dimensions?: Dimensions;
    images?: Image[];
    tags?: string[];
    metaTitle?: string;
    metaDescription?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    requiresShipping?: boolean;
    trackInventory?: boolean;
    variants?: CreateProductVariantRequest[];
    initialInventory?: number;
}

export interface UpdateProductRequest {
    name?: string;
    description?: string;
    shortDescription?: string;
    price?: number;
    comparePrice?: number;
    costPrice?: number;
    categoryId?: string;
    brand?: string;
    weight?: number;
    dimensions?: Dimensions;
    images?: Image[];
    tags?: string[];
    metaTitle?: string;
    metaDescription?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    requiresShipping?: boolean;
    trackInventory?: boolean;
}

export interface CreateProductVariantRequest {
    sku: string;
    name: string;
    price?: number;
    comparePrice?: number;
    costPrice?: number;
    inventoryQuantity?: number;
    weight?: number;
    imageUrl?: string;
    options: Record<string, string>;
    isActive?: boolean;
}

export interface UpdateProductVariantRequest {
    name?: string;
    price?: number;
    comparePrice?: number;
    costPrice?: number;
    inventoryQuantity?: number;
    weight?: number;
    imageUrl?: string;
    options?: Record<string, string>;
    isActive?: boolean;
}

export interface ProductSearchQuery {
    q?: string; // Search query
    categoryId?: string;
    vendorId?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    isActive?: boolean;
    isFeatured?: boolean;
    inStock?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt' | 'rating';
    sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters {
    categories: Array<{ id: string; name: string; count: number }>;
    brands: Array<{ name: string; count: number }>;
    priceRange: { min: number; max: number };
    tags: Array<{ name: string; count: number }>;
}