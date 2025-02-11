import { z } from "zod";
import mongoose from "mongoose";

const categoryIdSchema = z.string().refine(value => mongoose.Types.ObjectId.isValid(value) || typeof value === 'string', {
    message: "Invalid categoryId",
});

const createPayloadSchema = z.object({
    categoryName: z.string().min(1),
    categoryDescription: z.string().min(1),
    categoryImage: z.string().min(1),
    categorySubCategories: z.array(categoryIdSchema).optional(),
});

const getAllProductsSchema = z.object({
    categoryId: categoryIdSchema,
    page: z.number().positive().optional(),
    limit: z.number().positive().optional(),
});

const getAllSubCategoriesSchema = z.object({
    categoryId: categoryIdSchema,
    page: z.number().positive().optional(),
    limit: z.number().positive().optional(),
});

const deleteOneSchema = z.object({
    categoryId: categoryIdSchema,
});

const deleteMultipleSchema = z.object({
    categoryIds: z.array(categoryIdSchema).min(1),
});

const updateSchema = z.object({
    categoryId: categoryIdSchema,
    updatedData: z.record(z.unknown()), // Adjust the type accordingly
});

const addSubCategorySchema = z.object({
    categoryId: categoryIdSchema,
    subCategoryId: categoryIdSchema,
});

const removeSubCategorySchema = z.object({
    categoryId: categoryIdSchema,
    subCategoryId: categoryIdSchema,
});

const getAllSchema = z.object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
});

export default {
    createPayloadSchema,
    getAllProductsSchema,
    getAllSubCategoriesSchema,
    deleteOneSchema,
    deleteMultipleSchema,
    updateSchema,
    addSubCategorySchema,
    removeSubCategorySchema,
    getAllSchema,
};
