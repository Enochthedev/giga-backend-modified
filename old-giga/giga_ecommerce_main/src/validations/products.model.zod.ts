import { Schema, z } from "zod";
import mongoose from 'mongoose';

const getPopularProductsSchema = z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
});

const getNewProductsSchema = z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
});

const getProductReviewsSchema = z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    productId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid productId",
    }),
});

const getProductRatingSchema = z.object({
    productId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid productId",
    }),
});

const createProductSchema = z.object({
    //vendor is an object id
    vendor: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid vendorId",
    }),
    productName: z.string().min(1),
    productDisplayName: z.string().min(1),
    productDescription: z.string().min(1),
    productCategory:  z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid CategoryId",
    }),
    productSubCategory:  z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid CategoryId",
    }),
    productImages: z.array(z.string()).min(1),
    productPrice: z.number().min(1),
    productAmountInStock: z.number().min(1),
    productFulfilmentTime: z.number().min(1)
});

const removeReviewSchema = z.object({
    userId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid userId",
    }),
    reviewId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid reviewId",
    }),
});

const getProductSchema = z.object({
    reviewsPage: z.number().optional(),
    reviewsLimit: z.number().optional(),
    productId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value)|| typeof value === 'string', {
        message: "Invalid productId",
    }),
});

const addReviewSchema = z.object({
    userId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid userId",
    }),
    productId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid productId",
    }),
    review: z.string().min(1),
    productRating: z.number().optional(),
});

const searchSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
    product: z.string().optional(),
    rating: z.number().optional(),
    sort: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    shop: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
});

const updateSchema = z.object({
    productId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid productId",
    }),
    productName: z.string().min(1).optional(),
    productDisplayName: z.string().min(1).optional(),
    productDescription: z.string().min(1).optional(),
    productCategory: z.string().min(1).optional(),
    productSubCategory: z.string().min(1).optional(),
    productImages: z.array(z.string()).min(1).optional(),
    productPrice: z.number().min(1).optional(),
    productAmountInStock: z.number().min(1).optional(),
    productFulfilmentTime: z.number().min(1).optional(),
});

const removeSchema = z.object({
    productId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid productId",
    }),
});

export default {
    getPopularProductsSchema,
    getNewProductsSchema,
    getProductReviewsSchema,
    getProductRatingSchema,
    createProductSchema,
    removeReviewSchema,
    getProductSchema,
    addReviewSchema,
    searchSchema,
    updateSchema,
    removeSchema,
};
