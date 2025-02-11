import z from 'zod';
import mongoose from 'mongoose';

const createSubCategorySchema = z.object({
    subCategoryName: z.string().min(2).max(255),
    subCategoryDescription: z.string().min(2).max(255),
    subCategoryImage: z.string().min(2).max(255),
    subCategoryProducts: z.array(z.string().min(2).max(255)).optional(),
});

const getAllSubCategoriesSchema = z.object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
});

const getAllSubCategoryProductsSchema = z.object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
    subCategoryId: z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid SubcategoryId",})
});

const deleteSubCategorySchema = z.object({
    subCategoryId:z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid SubcategoryId",})
});

const updateSubCategorySchema = z.object({
    subCategoryId:z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
        message: "Invalid SubcategoryId",}),
    updatedData: z.record(z.unknown()),
});

export default {
    createSubCategorySchema,
    getAllSubCategoriesSchema,
    getAllSubCategoryProductsSchema,
    deleteSubCategorySchema,
    updateSubCategorySchema
}