import { Request, Response } from 'express';
import httpStatus from 'http-status';
import SubCategoryZod from '../validations/subCategory.model.zod';
import SubCategoryService from '../services/subCategory.service';

class SubCategoryController{
    public async createSubCategory(req: Request, res: Response) {
        try {
            const validatedRequest = SubCategoryZod.createSubCategorySchema.parse(req.body);
            const response = await SubCategoryService.createSubCategory(validatedRequest);
            return res.status(response.status).json(response);
        } catch (error:any) {
            console.log('Error creating subCategory:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async getAllSubCategories(req: Request, res: Response) {
        try {
            const validatedRequest = SubCategoryZod.getAllSubCategoriesSchema.parse(req.query);
            const response = await SubCategoryService.getAllSubCategories(validatedRequest);
            return res.status(response.status).json(response);
        } catch (error:any) {
            console.log('Error getting all subCategories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async getAllProductsBySubCategory(req: Request, res: Response) {
        try {
            const validatedRequest = SubCategoryZod.getAllSubCategoryProductsSchema.parse(req.query);
            const response = await SubCategoryService.getAllProductsBySubCategory(validatedRequest);
            return res.status(response.status).json(response);
        } catch (error:any) {
            console.log('Error getting all products for a subCategory:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async deleteSubCategory(req: Request, res: Response) {
        try {
            const validatedRequest = SubCategoryZod.deleteSubCategorySchema.parse(req.params);
            const response = await SubCategoryService.deleteSubCategory(validatedRequest);
            return res.status(response.status).json(response);
        } catch (error:any) {
            console.log('Error deleting subCategory:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    public async updateSubCategory(req: Request, res: Response) {
        try {
            const validatedRequest = SubCategoryZod.updateSubCategorySchema.parse(req.body);
            const response = await SubCategoryService.updateSubCategory(validatedRequest);
            return res.status(response.status).json(response);
        } catch (error:any) {
            console.log('Error updating subCategory:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

}

export default new SubCategoryController();