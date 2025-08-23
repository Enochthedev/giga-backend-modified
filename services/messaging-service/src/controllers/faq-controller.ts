import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import faqService from '../services/faq-service';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Controller for FAQ management system
 * Handles FAQ and FAQ category management endpoints
 */
class FAQController {
    /**
     * Create a new FAQ
     */
    public createFAQ = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const {
            question,
            answer,
            categoryId,
            tags = [],
            isPublished = false
        } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Only admin and support can create FAQs
        if (userRole !== 'admin' && userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const faq = await faqService.createFAQ(
            question,
            answer,
            categoryId,
            tags,
            userId,
            isPublished
        );

        res.status(201).json({
            success: true,
            data: faq,
            message: 'FAQ created successfully'
        });
    });

    /**
     * Get FAQ by ID
     */
    public getFAQ = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { faqId } = req.params;
        const userRole = req.user?.role;

        // Allow unpublished FAQs for admin and support
        const includeUnpublished = userRole === 'admin' || userRole === 'support';

        const faq = await faqService.getFAQById(faqId, includeUnpublished);

        res.json({
            success: true,
            data: faq
        });
    });

    /**
     * Get FAQs with filtering and pagination
     */
    public getFAQs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const categoryId = req.query.categoryId as string;
        const tags = req.query.tags ?
            (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) as string[] :
            undefined;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sortBy = req.query.sortBy as string;
        const sortOrder = req.query.sortOrder as 'asc' | 'desc';

        const userRole = req.user?.role;
        const includeUnpublished = userRole === 'admin' || userRole === 'support';

        const pagination = { page, limit, sortBy, sortOrder };

        const result = await faqService.getFAQs(
            categoryId,
            tags,
            includeUnpublished,
            pagination
        );

        res.json({
            success: true,
            data: result.faqs,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Search FAQs
     */
    public searchFAQs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { q: query, categoryId } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await faqService.searchFAQs(
            query as string,
            categoryId as string,
            page,
            limit
        );

        res.json({
            success: true,
            data: result.faqs,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Update FAQ
     */
    public updateFAQ = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { faqId } = req.params;
        const updates = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const faq = await faqService.updateFAQ(faqId, updates, userId, userRole);

        res.json({
            success: true,
            data: faq,
            message: 'FAQ updated successfully'
        });
    });

    /**
     * Delete FAQ
     */
    public deleteFAQ = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { faqId } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        await faqService.deleteFAQ(faqId, userId, userRole);

        res.json({
            success: true,
            message: 'FAQ deleted successfully'
        });
    });

    /**
     * Rate FAQ as helpful or not helpful
     */
    public rateFAQ = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { faqId } = req.params;
        const { isHelpful } = req.body;

        await faqService.rateFAQ(faqId, isHelpful);

        res.json({
            success: true,
            message: 'FAQ rating recorded successfully'
        });
    });

    /**
     * Get popular FAQs
     */
    public getPopularFAQs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const categoryId = req.query.categoryId as string;
        const limit = parseInt(req.query.limit as string) || 10;

        const faqs = await faqService.getPopularFAQs(categoryId, limit);

        res.json({
            success: true,
            data: faqs
        });
    });

    // FAQ Categories Management

    /**
     * Create FAQ category
     */
    public createFAQCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { name, description, icon, sortOrder } = req.body;
        const userRole = req.user!.role;

        // Only admin can create categories
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const category = await faqService.createFAQCategory(name, description, icon, sortOrder);

        res.status(201).json({
            success: true,
            data: category,
            message: 'FAQ category created successfully'
        });
    });

    /**
     * Get all FAQ categories
     */
    public getFAQCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userRole = req.user?.role;
        const includeInactive = userRole === 'admin';

        const categories = await faqService.getFAQCategories(includeInactive);

        res.json({
            success: true,
            data: categories
        });
    });

    /**
     * Update FAQ category
     */
    public updateFAQCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { categoryId } = req.params;
        const updates = req.body;
        const userRole = req.user!.role;

        // Only admin can update categories
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const category = await faqService.updateFAQCategory(categoryId, updates);

        res.json({
            success: true,
            data: category,
            message: 'FAQ category updated successfully'
        });
    });

    /**
     * Delete FAQ category
     */
    public deleteFAQCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { categoryId } = req.params;
        const userRole = req.user!.role;

        // Only admin can delete categories
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        await faqService.deleteFAQCategory(categoryId);

        res.json({
            success: true,
            message: 'FAQ category deleted successfully'
        });
    });

    /**
     * Get FAQ categories with FAQ counts
     */
    public getFAQCategoriesWithCounts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userRole = req.user?.role;
        const includeInactive = userRole === 'admin';

        const categories = await faqService.getFAQCategories(includeInactive);

        // Get FAQ counts for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const result = await require('../database/connection').default.query(
                    `SELECT COUNT(*) as faq_count 
           FROM faqs 
           WHERE category_id = $1 ${includeInactive ? '' : 'AND is_published = true'}`,
                    [category.id]
                );

                return {
                    ...category,
                    faqCount: parseInt(result.rows[0].faq_count)
                };
            })
        );

        res.json({
            success: true,
            data: categoriesWithCounts
        });
    });

    /**
     * Get FAQ suggestions based on search query
     */
    public getFAQSuggestions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { q: query } = req.query;
        const limit = parseInt(req.query.limit as string) || 5;

        if (!query || (query as string).length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        const result = await faqService.searchFAQs(query as string, undefined, 1, limit);

        // Return simplified suggestions
        const suggestions = result.faqs.map(faq => ({
            id: faq.id,
            question: faq.question,
            category: faq.category_name
        }));

        res.json({
            success: true,
            data: suggestions
        });
    });

    /**
     * Get FAQ analytics (admin only)
     */
    public getFAQAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userRole = req.user!.role;

        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const result = await require('../database/connection').default.query(`
      SELECT 
        COUNT(*) as total_faqs,
        COUNT(CASE WHEN is_published = true THEN 1 END) as published_faqs,
        COUNT(CASE WHEN is_published = false THEN 1 END) as draft_faqs,
        SUM(view_count) as total_views,
        SUM(helpful_count) as total_helpful_votes,
        SUM(not_helpful_count) as total_not_helpful_votes,
        AVG(view_count) as avg_views_per_faq,
        ROUND(AVG(CASE WHEN (helpful_count + not_helpful_count) > 0 
          THEN helpful_count::float / (helpful_count + not_helpful_count) * 100 
          ELSE 0 END), 2) as avg_helpfulness_rate
      FROM faqs
    `);

        const analytics = result.rows[0];

        // Get top viewed FAQs
        const topViewedResult = await require('../database/connection').default.query(`
      SELECT id, question, view_count, helpful_count, not_helpful_count
      FROM faqs 
      WHERE is_published = true
      ORDER BY view_count DESC 
      LIMIT 10
    `);

        // Get category distribution
        const categoryDistResult = await require('../database/connection').default.query(`
      SELECT c.name, COUNT(f.id) as faq_count
      FROM faq_categories c
      LEFT JOIN faqs f ON c.id = f.category_id AND f.is_published = true
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      ORDER BY faq_count DESC
    `);

        res.json({
            success: true,
            data: {
                overview: analytics,
                topViewed: topViewedResult.rows,
                categoryDistribution: categoryDistResult.rows
            }
        });
    });
}

export default new FAQController();