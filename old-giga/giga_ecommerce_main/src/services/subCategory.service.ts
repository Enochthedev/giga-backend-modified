
import { Schema } from 'mongoose';
import SubCategory  from '../models/general/subCategory.model';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status'

interface CreatePayload {
    subCategoryName: string;
    subCategoryDescription: string;
    subCategoryImage: string;
    subCategoryProducts?: string[];

}

interface getAllPayload {
    page?: number;
    limit?: number;
}

interface getAllProductsPayload {
    page?: number;
    limit?: number;
    subCategoryId: Schema.Types.ObjectId | string;
}

interface deletePayload {
    subCategoryId: Schema.Types.ObjectId | string;
}

interface updatePayload {
    subCategoryId: Schema.Types.ObjectId | string;
    updatedData: Record<string, unknown>;
}


class SubCategoriesService {
    public async createSubCategory(subCategory: CreatePayload): Promise<ApiResponse<any>> {
        try {
            const { subCategoryName, subCategoryDescription, subCategoryImage, subCategoryProducts } = subCategory;
            //check if subCategory name already exists
            const subCategoryExists = await SubCategory.doesSubCategoryExist(subCategoryName);
            if (subCategoryExists) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Subcategory already exists' );
            }
            
            const createdSubCategory = await SubCategory.create({ subCategoryName, subCategoryDescription, subCategoryImage, subCategoryProducts: subCategoryProducts ? subCategoryProducts : []});

            const response ={
                success: true,
                message: 'Subcategory created successfully',
                data: createdSubCategory
            }
            return new ApiResponse(httpStatus.CREATED, response);
        } catch (error:any) {
            console.error('Error creating subCategory:', error.message);
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

    public async getAllSubCategories(payload: getAllPayload): Promise<ApiResponse<any>> {
        try {
            const { page = 1, limit = 10 } = payload;
            const subCategories = await SubCategory.find({});

            const totalSubCategories = subCategories.length;
            const totalPages = Math.ceil(totalSubCategories / limit);
            const offset = limit * (page - 1);
            const paginatedSubCategories = subCategories.slice(offset, offset + limit);

            const response = {
                success: true,
                message: 'Subcategories fetched successfully',
                data: {
                    subCategories: paginatedSubCategories,
                    totalPages,
                    currentPage: page,
                    totalSubCategories
                }
            }
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error fetching subcategories:', error.message);
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
    
    public getAllProductsBySubCategory = async (payload: getAllProductsPayload): Promise<ApiResponse<any>> => {
        try {
            const { page = 1, limit = 10, subCategoryId } = payload;
            const subCategory = await SubCategory.findById(subCategoryId);
            if (!subCategory) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Subcategory not found' });
            }
            const products = subCategory.subCategoryProducts;
            const totalProducts = products.length;
            const totalPages = Math.ceil(totalProducts / limit);
            const offset = limit * (page - 1);
            const paginatedProducts = products.slice(offset, offset + limit);

            const response = {
                success: true,
                message: 'Products fetched successfully',
                data: {
                    products: paginatedProducts,
                    totalPages,
                    currentPage: page,
                    totalProducts
                }
            }
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error fetching products:', error.message);
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

    public async deleteSubCategory(payload: deletePayload): Promise<ApiResponse<any>> {
        try {
            const { subCategoryId } = payload;
            const subCategory = await SubCategory.findOne({ subCategoryId });
            if (!subCategory) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory not found' );
            }
            await SubCategory.deleteOne({ subCategoryId });
            const response = {
                success: true,
                message: 'Subcategory deleted successfully',
            }
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error deleting subcategory:', error.message);
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

    public async updateSubCategory(payload: updatePayload): Promise<ApiResponse<any>> {
        try {
            const { subCategoryId, updatedData } = payload;
            const subCategory = await SubCategory.findOne({ subCategoryId });
            if (!subCategory) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory not found' );
            }
            await SubCategory.updateOne({ subCategoryId }, updatedData);
            const response = {
                success: true,
                message: 'Subcategory updated successfully',
            }
            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error updating subcategory:', error.message);
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
}


export default new SubCategoriesService()

