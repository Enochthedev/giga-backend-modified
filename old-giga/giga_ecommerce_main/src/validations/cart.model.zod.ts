import { z } from "zod";

const CartSchema = z.object({
    id: z.string(),
    userId: z.string(),
    items: z.array(
        z.object({
            productId: z.string(),
            quantity: z.number().positive(),
        })
    ),
    createdAt: z.date(),
});

const addToCartSchema = z.object({
    userId: z.string(),
    productId: z.string(),
    quantity: z.number().positive(),
});

const removeFromCartSchema = z.object({
    userId: z.string(),
    productId: z.string(),
    quantity: z.number().positive(),
});

const updateCartSchema = z.object({
    userId: z.string(),
    productId: z.string(),
    quantity: z.number().positive(),
});

const getCartSchema = z.object({
    userId: z.string(),
});

const deleteCartSchema = z.object({
    userId: z.string(),
});

export default {
    CartSchema,
    addToCartSchema,
    removeFromCartSchema,
    updateCartSchema,
    getCartSchema,
    deleteCartSchema,
};