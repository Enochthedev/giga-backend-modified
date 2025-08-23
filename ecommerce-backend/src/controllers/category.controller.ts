import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Category controller
 */
export class CategoryController {
    /**
     * Create category (admin only)
     */
    public static createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const category = await CategoryService.createCategory(req.body);

        res.status(201).json({
            success: true,
            data: category,
            message: 'Category created successfully'
        });
    });

    /**
     * Get category by ID
     */
    public static getCategory = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const category = await CategoryService.getCategoryById(id);

        res.json({
            success: true,
            data: category
        });
    });

    /**
     * Update category (admin only)
     */
    public static updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const category = await CategoryService.updateCategory(id, req.body);

        res.json({
            success: true,
            data: category,
            message: 'Category updated successfully'
        });
    });

    /**
     * Delete category (admin only)
     */
    public static deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        await CategoryService.deleteCategory(id);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    });

    /**
     * Get category tree
     */
    public static getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
        const includeInactive = req.query.includeInactive === 'true';
        const tree = await CategoryService.getCategoryTree(includeInactive);

        res.json({
            success: true,
            data: tree
        });
    });

    /**
     * Get categories by parent
     */
    public static getCategoriesByParent = asyncHandler(async (req: Request, res: Response) => {
        const { parentId } = req.params;
        const includeInactive = req.query.includeInactive === 'true';
        const categories = await CategoryService.getCategoriesByParent(
            parentId === 'root' ? undefined : parentId,
            includeInactive
        );

        res.json({
            success: true,
            data: categories
        });
    });

    /**
     * Get category path (breadcrumb)
     */
    public static getCategoryPath = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const path = await CategoryService.getCategoryPath(id);

        res.json({
            success: true,
            data: path
        });
    });

    /**
     * Search categories
     */
    public static searchCategories = asyncHandler(async (req: Request, res: Response) => {
        const { q } = req.query;
        const includeInactive = req.query.includeInactive === 'true';

        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
            return;
        }

        const categories = await CategoryService.searchCategories(q, includeInactive);

        res.json({
            success: true,
            data: categories
        });
    });

    /**
     * Get category statistics (admin only)
     */
    public static getCategoryStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const stats = await CategoryService.getCategoryStats();

        res.json({
            success: true,
            data: stats
        });
    });
}