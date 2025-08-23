import db from '../database/connection';
import logger from '../utils/logger';
import { FAQ, FAQCategory, PaginationOptions } from '../types';
import { createError } from '../middleware/error-middleware';

/**
 * Service for managing FAQ system
 * Handles FAQ creation, categorization, search, and analytics
 */
class FAQService {
    /**
     * Create a new FAQ
     */
    public async createFAQ(
        question: string,
        answer: string,
        categoryId: string,
        tags: string[] = [],
        createdBy: string,
        isPublished: boolean = false
    ): Promise<FAQ> {
        try {
            // Verify category exists
            const categoryResult = await db.query(
                'SELECT id FROM faq_categories WHERE id = $1 AND is_active = true',
                [categoryId]
            );

            if (categoryResult.rows.length === 0) {
                throw createError('Invalid FAQ category', 400);
            }

            const result = await db.query(
                `INSERT INTO faqs (question, answer, category_id, tags, created_by, is_published)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [question, answer, categoryId, tags, createdBy, isPublished]
            );

            logger.info('FAQ created:', {
                faqId: result.rows[0].id,
                categoryId,
                createdBy,
                isPublished
            });

            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to create FAQ:', error);
            throw createError('Failed to create FAQ', 500);
        }
    }

    /**
     * Get FAQ by ID
     */
    public async getFAQById(faqId: string, includeUnpublished: boolean = false): Promise<FAQ> {
        try {
            let query = `
        SELECT f.*, c.name as category_name, u.name as created_by_name
        FROM faqs f
        LEFT JOIN faq_categories c ON f.category_id = c.id
        LEFT JOIN users u ON f.created_by = u.id
        WHERE f.id = $1
      `;

            if (!includeUnpublished) {
                query += ' AND f.is_published = true';
            }

            const result = await db.query(query, [faqId]);

            if (result.rows.length === 0) {
                throw createError('FAQ not found', 404);
            }

            // Increment view count
            await db.query(
                'UPDATE faqs SET view_count = view_count + 1 WHERE id = $1',
                [faqId]
            );

            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to get FAQ:', error);
            throw createError('Failed to get FAQ', 500);
        }
    }

    /**
     * Get FAQs with filtering and pagination
     */
    public async getFAQs(
        categoryId?: string,
        tags?: string[],
        includeUnpublished: boolean = false,
        pagination: PaginationOptions = { page: 1, limit: 20 }
    ): Promise<{ faqs: FAQ[]; total: number }> {
        try {
            const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
            const offset = (page - 1) * limit;

            let whereConditions: string[] = [];
            let params: any[] = [];
            let paramIndex = 1;

            if (!includeUnpublished) {
                whereConditions.push('f.is_published = true');
            }

            if (categoryId) {
                whereConditions.push(`f.category_id = $${paramIndex}`);
                params.push(categoryId);
                paramIndex++;
            }

            if (tags && tags.length > 0) {
                whereConditions.push(`f.tags && $${paramIndex}`);
                params.push(tags);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
        SELECT f.*, c.name as category_name, u.name as created_by_name,
               COUNT(*) OVER() as total_count
        FROM faqs f
        LEFT JOIN faq_categories c ON f.category_id = c.id
        LEFT JOIN users u ON f.created_by = u.id
        ${whereClause}
        ORDER BY f.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            params.push(limit, offset);

            const result = await db.query(query, params);
            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return { faqs: result.rows, total };
        } catch (error) {
            logger.error('Failed to get FAQs:', error);
            throw createError('Failed to get FAQs', 500);
        }
    }

    /**
     * Search FAQs
     */
    public async searchFAQs(
        query: string,
        categoryId?: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ faqs: FAQ[]; total: number }> {
        try {
            const offset = (page - 1) * limit;
            let searchQuery: string;
            let params: any[];

            if (categoryId) {
                searchQuery = `
          SELECT f.*, c.name as category_name, u.name as created_by_name,
                 ts_rank(to_tsvector('english', f.question || ' ' || f.answer), plainto_tsquery('english', $2)) as rank,
                 COUNT(*) OVER() as total_count
          FROM faqs f
          LEFT JOIN faq_categories c ON f.category_id = c.id
          LEFT JOIN users u ON f.created_by = u.id
          WHERE f.is_published = true AND f.category_id = $1
            AND to_tsvector('english', f.question || ' ' || f.answer) @@ plainto_tsquery('english', $2)
          ORDER BY rank DESC, f.view_count DESC
          LIMIT $3 OFFSET $4
        `;
                params = [categoryId, query, limit, offset];
            } else {
                searchQuery = `
          SELECT f.*, c.name as category_name, u.name as created_by_name,
                 ts_rank(to_tsvector('english', f.question || ' ' || f.answer), plainto_tsquery('english', $1)) as rank,
                 COUNT(*) OVER() as total_count
          FROM faqs f
          LEFT JOIN faq_categories c ON f.category_id = c.id
          LEFT JOIN users u ON f.created_by = u.id
          WHERE f.is_published = true
            AND to_tsvector('english', f.question || ' ' || f.answer) @@ plainto_tsquery('english', $1)
          ORDER BY rank DESC, f.view_count DESC
          LIMIT $2 OFFSET $3
        `;
                params = [query, limit, offset];
            }

            const result = await db.query(searchQuery, params);
            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return { faqs: result.rows, total };
        } catch (error) {
            logger.error('Failed to search FAQs:', error);
            throw createError('Failed to search FAQs', 500);
        }
    }

    /**
     * Update FAQ
     */
    public async updateFAQ(
        faqId: string,
        updates: Partial<FAQ>,
        userId: string,
        userRole: string
    ): Promise<FAQ> {
        try {
            // Check if user has permission to update FAQ
            const faqResult = await db.query(
                'SELECT created_by FROM faqs WHERE id = $1',
                [faqId]
            );

            if (faqResult.rows.length === 0) {
                throw createError('FAQ not found', 404);
            }

            const faq = faqResult.rows[0];

            if (userRole !== 'admin' && faq.created_by !== userId) {
                throw createError('Access denied', 403);
            }

            // Build update query dynamically
            const updateFields: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (updates.question !== undefined) {
                updateFields.push(`question = $${paramIndex}`);
                params.push(updates.question);
                paramIndex++;
            }

            if (updates.answer !== undefined) {
                updateFields.push(`answer = $${paramIndex}`);
                params.push(updates.answer);
                paramIndex++;
            }

            if (updates.categoryId !== undefined) {
                // Verify category exists
                const categoryResult = await db.query(
                    'SELECT id FROM faq_categories WHERE id = $1 AND is_active = true',
                    [updates.categoryId]
                );

                if (categoryResult.rows.length === 0) {
                    throw createError('Invalid FAQ category', 400);
                }

                updateFields.push(`category_id = $${paramIndex}`);
                params.push(updates.categoryId);
                paramIndex++;
            }

            if (updates.tags !== undefined) {
                updateFields.push(`tags = $${paramIndex}`);
                params.push(updates.tags);
                paramIndex++;
            }

            if (updates.isPublished !== undefined) {
                updateFields.push(`is_published = $${paramIndex}`);
                params.push(updates.isPublished);
                paramIndex++;
            }

            if (updateFields.length === 0) {
                throw createError('No fields to update', 400);
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(faqId);

            const query = `
        UPDATE faqs 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

            const result = await db.query(query, params);

            logger.info('FAQ updated:', {
                faqId,
                updatedBy: userId,
                fields: Object.keys(updates)
            });

            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to update FAQ:', error);
            throw createError('Failed to update FAQ', 500);
        }
    }

    /**
     * Delete FAQ
     */
    public async deleteFAQ(faqId: string, userId: string, userRole: string): Promise<void> {
        try {
            // Check if user has permission to delete FAQ
            const faqResult = await db.query(
                'SELECT created_by FROM faqs WHERE id = $1',
                [faqId]
            );

            if (faqResult.rows.length === 0) {
                throw createError('FAQ not found', 404);
            }

            const faq = faqResult.rows[0];

            if (userRole !== 'admin' && faq.created_by !== userId) {
                throw createError('Access denied', 403);
            }

            await db.query('DELETE FROM faqs WHERE id = $1', [faqId]);

            logger.info('FAQ deleted:', {
                faqId,
                deletedBy: userId
            });
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to delete FAQ:', error);
            throw createError('Failed to delete FAQ', 500);
        }
    }

    /**
     * Mark FAQ as helpful or not helpful
     */
    public async rateFAQ(faqId: string, isHelpful: boolean): Promise<void> {
        try {
            const field = isHelpful ? 'helpful_count' : 'not_helpful_count';

            await db.query(
                `UPDATE faqs SET ${field} = ${field} + 1 WHERE id = $1`,
                [faqId]
            );

            logger.info('FAQ rated:', {
                faqId,
                isHelpful
            });
        } catch (error) {
            logger.error('Failed to rate FAQ:', error);
            throw createError('Failed to rate FAQ', 500);
        }
    }

    /**
     * Get popular FAQs
     */
    public async getPopularFAQs(
        categoryId?: string,
        limit: number = 10
    ): Promise<FAQ[]> {
        try {
            let query = `
        SELECT f.*, c.name as category_name
        FROM faqs f
        LEFT JOIN faq_categories c ON f.category_id = c.id
        WHERE f.is_published = true
      `;

            const params: any[] = [];
            let paramIndex = 1;

            if (categoryId) {
                query += ` AND f.category_id = $${paramIndex}`;
                params.push(categoryId);
                paramIndex++;
            }

            query += `
        ORDER BY f.view_count DESC, f.helpful_count DESC
        LIMIT $${paramIndex}
      `;
            params.push(limit);

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Failed to get popular FAQs:', error);
            throw createError('Failed to get popular FAQs', 500);
        }
    }

    // FAQ Categories Management

    /**
     * Create FAQ category
     */
    public async createFAQCategory(
        name: string,
        description: string,
        icon?: string,
        sortOrder: number = 0
    ): Promise<FAQCategory> {
        try {
            const result = await db.query(
                `INSERT INTO faq_categories (name, description, icon, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
                [name, description, icon, sortOrder]
            );

            logger.info('FAQ category created:', {
                categoryId: result.rows[0].id,
                name
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to create FAQ category:', error);
            throw createError('Failed to create FAQ category', 500);
        }
    }

    /**
     * Get all FAQ categories
     */
    public async getFAQCategories(includeInactive: boolean = false): Promise<FAQCategory[]> {
        try {
            let query = 'SELECT * FROM faq_categories';

            if (!includeInactive) {
                query += ' WHERE is_active = true';
            }

            query += ' ORDER BY sort_order ASC, name ASC';

            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            logger.error('Failed to get FAQ categories:', error);
            throw createError('Failed to get FAQ categories', 500);
        }
    }

    /**
     * Update FAQ category
     */
    public async updateFAQCategory(
        categoryId: string,
        updates: Partial<FAQCategory>
    ): Promise<FAQCategory> {
        try {
            // Build update query dynamically
            const updateFields: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (updates.name !== undefined) {
                updateFields.push(`name = $${paramIndex}`);
                params.push(updates.name);
                paramIndex++;
            }

            if (updates.description !== undefined) {
                updateFields.push(`description = $${paramIndex}`);
                params.push(updates.description);
                paramIndex++;
            }

            if (updates.icon !== undefined) {
                updateFields.push(`icon = $${paramIndex}`);
                params.push(updates.icon);
                paramIndex++;
            }

            if (updates.sortOrder !== undefined) {
                updateFields.push(`sort_order = $${paramIndex}`);
                params.push(updates.sortOrder);
                paramIndex++;
            }

            if (updates.isActive !== undefined) {
                updateFields.push(`is_active = $${paramIndex}`);
                params.push(updates.isActive);
                paramIndex++;
            }

            if (updateFields.length === 0) {
                throw createError('No fields to update', 400);
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(categoryId);

            const query = `
        UPDATE faq_categories 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

            const result = await db.query(query, params);

            if (result.rows.length === 0) {
                throw createError('FAQ category not found', 404);
            }

            logger.info('FAQ category updated:', {
                categoryId,
                fields: Object.keys(updates)
            });

            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to update FAQ category:', error);
            throw createError('Failed to update FAQ category', 500);
        }
    }

    /**
     * Delete FAQ category
     */
    public async deleteFAQCategory(categoryId: string): Promise<void> {
        try {
            // Check if category has FAQs
            const faqCount = await db.query(
                'SELECT COUNT(*) as count FROM faqs WHERE category_id = $1',
                [categoryId]
            );

            if (parseInt(faqCount.rows[0].count) > 0) {
                throw createError('Cannot delete category with existing FAQs', 400);
            }

            const result = await db.query(
                'DELETE FROM faq_categories WHERE id = $1',
                [categoryId]
            );

            if (result.rowCount === 0) {
                throw createError('FAQ category not found', 404);
            }

            logger.info('FAQ category deleted:', { categoryId });
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to delete FAQ category:', error);
            throw createError('Failed to delete FAQ category', 500);
        }
    }
}

export default new FAQService();