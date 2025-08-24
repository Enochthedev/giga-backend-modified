import { BaseEntity } from './common.types';

/**
 * Inventory related types
 */

export interface Inventory extends BaseEntity {
    productId?: string;
    variantId?: string;
    quantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
    location?: string;
    notes?: string;
}

export interface InventoryAdjustment {
    type: 'increase' | 'decrease' | 'set';
    quantity: number;
    reason: string;
    notes?: string;
}

export interface InventoryReservation {
    id: string;
    productId?: string;
    variantId?: string;
    quantity: number;
    orderId?: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface StockLevel {
    productId?: string;
    variantId?: string;
    available: number;
    reserved: number;
    total: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
}

export interface InventoryMovement extends BaseEntity {
    productId?: string;
    variantId?: string;
    type: 'in' | 'out' | 'adjustment' | 'reservation' | 'release';
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    reference?: string; // Order ID, adjustment ID, etc.
    notes?: string;
}