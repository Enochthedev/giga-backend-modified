import { Schema, Types } from "mongoose";
import Category, { ICategory } from "../models/general/category.model";
import Product from "../models/general/product.model";
import SubCategory from "../models/general/subCategory.model";
import ApiError from '../utils/ApiError';
import ApiResponse from "../utils/ApiResponse";
import httpStatus from 'http-status';

interface CreatePayload {
    categoryName: string;
    categoryDescription: string;
    categoryImage: string;
    categorySubCategories?: Schema.Types.ObjectId[] | string[];
}

interface GetAllProductsPayload {
    categoryId: Schema.Types.ObjectId | string;
    page?: number;
    limit?: number;
}

interface getAllPayload {
    page?: number;
    limit?: number;
}

interface GetAllSubCategoriesPayload {
    categoryId: Schema.Types.ObjectId | string;
    page?: number;
    limit?: number;
}

interface DeleteOnePayload {
    categoryId: Schema.Types.ObjectId | string;
}

interface DeleteMultiplePayload {
    categoryIds: Schema.Types.ObjectId[] | string[];
}

interface UpdatePayload {
    categoryId: Schema.Types.ObjectId | string;
    updatedData: any;
}

interface AddSubCategoryPayload {
    categoryId: Schema.Types.ObjectId | string;
    subCategoryId: Schema.Types.ObjectId | string;
}

interface RemoveSubCategoryPayload {
    categoryId: Schema.Types.ObjectId | string;
    subCategoryId: Schema.Types.ObjectId | string;
}

class CategoryService {
    public async create(payload: CreatePayload): Promise<ApiResponse<any>> {
        try {
            const { categoryName, categoryDescription, categoryImage, categorySubCategories } = payload;

            // Check if category name is taken
            const isTaken = await Category.isCategoryTaken(categoryName);
            if (isTaken) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Category name is already taken');
            }

            const newCategory: ICategory = await Category.create({
                categoryName,
                categoryDescription,
                categoryImage,
                categorySubCategories: categorySubCategories || [],
            });

            return new ApiResponse(httpStatus.CREATED, { success: true, data: newCategory.toObject() });
        } catch (error:any) {
            console.error('Error creating category:', error.message);
            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' });
        }
    }

    public async getAllProducts(payload: GetAllProductsPayload): Promise<ApiResponse<any>> {
        try {
            const { categoryId, page = 1, limit = 10 } = payload;

            // Check if the category exists
            const category = await Category.findById(categoryId).populate('categoryProducts', 'productName');

            if (!category) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
            }

            const totalProducts = category.categoryProducts.length;
            const skip = (page - 1) * limit;
            const products = category.categoryProducts.slice(skip, skip + limit);

            const response = {
                success: true,
                data: {
                    products,
                    totalPages: Math.ceil(totalProducts / limit),
                    currentPage: page,
                    totalResults: totalProducts,
                },
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error getting products for category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getAllSubCategories(payload: GetAllSubCategoriesPayload): Promise<ApiResponse<any>> {
        try {
            const { categoryId, page = 1, limit = 10 } = payload;

            // Check if the category exists
            const category = await Category.findById(categoryId).populate('categorySubCategories', 'subCategoryName');

            if (!category) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
            }

            const totalSubCategories = category.categorySubCategories.length;
            const skip = (page - 1) * limit;
            const subCategories = category.categorySubCategories.slice(skip, skip + limit);

            const response = {
                success: true,
                data: {
                    subCategories,
                    totalPages: Math.ceil(totalSubCategories / limit),
                    currentPage: page,
                    totalResults: totalSubCategories,
                },
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error getting subcategories for category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async deleteOne(payload: DeleteOnePayload): Promise<ApiResponse<any>> {
        try {
            const { categoryId } = payload;

            // Check if the category exists
            const category = await Category.findById(categoryId);

            if (!category) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
            }

            // Remove the category
            await category.remove();

            const response = {
                success: true,
                message: 'Category removed successfully',
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async deleteMultiple(payload: DeleteMultiplePayload): Promise<ApiResponse<any>> {
        try {
            const { categoryIds } = payload;

            // Check if the categories exist
            const categories = await Category.find({ _id: { $in: categoryIds } });

            if (categories.length !== categoryIds.length) {
                throw new ApiError(httpStatus.NOT_FOUND, 'One or more categories not found');
            }

            // Remove the categories
            await Category.deleteMany({ _id: { $in: categoryIds } });

            const response = {
                success: true,
                message: 'Categories removed successfully',
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing categories:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getAll(payload:getAllPayload) : Promise<ApiResponse<any>>{
        try {
            const { page = 1, limit = 10 } = payload;

            const categories = await Category.find();

            // Case: No categories exist
            if (categories.length === 0) {
                throw new ApiError(httpStatus.NOT_FOUND, 'No categories exist');
            }

            const totalCategories = categories.length;
            const skip = (page - 1) * limit;
            const Categories = categories.slice(skip, skip + limit);



            // Case: Categories exist
            const response = {
                success: true,
                data: {
                    Categories,
                    totalPages: Math.ceil(totalCategories / limit),
                    currentPage: page,
                    totalResults: totalCategories
                }
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error getting all categories:', error.message);
            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' });
        }
    }

    public async update(payload: UpdatePayload): Promise<ApiResponse<any>> {
        try {
            const { categoryId, updatedData } = payload;
    
            // Check if the category exists
            const category = await Category.findById(categoryId);
    
            if (!category) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
            }
    
            // Update the category fields based on the payload
            for (const [key, value] of Object.entries(updatedData)) {
                if (value !== undefined) {
                    // Use type assertion to inform TypeScript about the key and value types
                    (category as any)[key] = value;
                }
            }
    
            // Save the updated category
            await category.save();
    
            const updatedCategory = await Category.findById(categoryId).populate('categorySubCategories', 'subCategoryName');
    
            // Additional logic or formatting of the updated category if needed
            const response = {
                success: true,
                data: updatedCategory,
            };
    
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error updating category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async addSubCategory(payload: AddSubCategoryPayload): Promise<ApiResponse<any>> {
        try {
            const { categoryId, subCategoryId } = payload;

            // Check if both the category and subcategory exist
            const category = await Category.findById(categoryId);
            const subCategory = await SubCategory.findById(subCategoryId);

            if (!category || !subCategory) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Category or subcategory not found');
            }

            // Add the subcategory to the category
            category.categorySubCategories.push(subCategory._id);
            await category.save();

            const response = {
                success: true,
                message: 'Subcategory added to category successfully',
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error adding subcategory to category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async removeSubCategory(payload: RemoveSubCategoryPayload): Promise<ApiResponse<any>> {
        try {
            const { categoryId, subCategoryId } = payload;

            // Check if both the category and subcategory exist
            const category = await Category.findById(categoryId);
            const subCategory = await SubCategory.findById(subCategoryId);

            if (!category || !subCategory) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Category or subcategory not found');
            }

            // Remove the subcategory from the category
            category.categorySubCategories = category.categorySubCategories.filter((id) => !id.equals(subCategory._id));
            await category.save();

            const response = {
                success: true,
                message: 'Subcategory removed from category successfully',
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing subcategory from category:', error.message);
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    // Implement other methods...

}

export default new CategoryService();

