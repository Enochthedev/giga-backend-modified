import { Request, Response } from 'express';
import httpStatus from 'http-status';
import categoryService from '../services/category.service';
import CategoryZod from '../validations/categories.model.zod';

class CategoryController {
    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.createPayloadSchema.parse(req.body);
            // Additional logic or validations if needed

            const response = await categoryService.create(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error creating category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.getAllSchema.parse(req.query);
            const response = await categoryService.getAll(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error getting all categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getAllProducts = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.getAllProductsSchema.parse(req.query);
            // Additional logic or validations if needed

            const response = await categoryService.getAllProducts(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error getting all products for a category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getAllSubCategories = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.getAllSubCategoriesSchema.parse(req.query);
            // Additional logic or validations if needed

            const response = await categoryService.getAllSubCategories(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error getting all subcategories for a category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public deleteOne = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.deleteOneSchema.parse(req.params);
            // Additional logic or validations if needed

            const response = await categoryService.deleteOne(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error deleting a category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public deleteMultiple = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.deleteMultipleSchema.parse(req.body);
            // Additional logic or validations if needed

            const response = await categoryService.deleteMultiple(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error deleting multiple categories:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public update = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.updateSchema.parse(req.body);
            // Additional logic or validations if needed

            const response = await categoryService.update(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error updating a category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public addSubCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.addSubCategorySchema.parse(req.body);
            // Additional logic or validations if needed

            const response = await categoryService.addSubCategory(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error adding a subcategory to a category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public removeSubCategory = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = CategoryZod.removeSubCategorySchema.parse(req.body);
            // Additional logic or validations if needed

            const response = await categoryService.removeSubCategory(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error removing a subcategory from a category:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    // add other methods
}

export default new CategoryController();
