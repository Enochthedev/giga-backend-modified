import { BaseEntity } from './common.types';

/**
 * Category related types
 */

export interface Category extends BaseEntity {
    name: string;
    description?: string;
    parentId?: string;
    imageUrl?: string;
    isActive: boolean;
}

export interface CreateCategoryRequest {
    name: string;
    description?: string;
    parentId?: string;
    imageUrl?: string;
    isActive?: boolean;
}

export interface UpdateCategoryRequest {
    name?: string;
    description?: string;
    parentId?: string;
    imageUrl?: string;
    isActive?: boolean;
}

export interface CategoryWithChildren extends Category {
    children: CategoryWithChildren[];
    productCount?: number;
}

export interface CategoryTree {
    categories: CategoryWithChildren[];
}