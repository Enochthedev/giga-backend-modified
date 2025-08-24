import { EcommerceDatabase } from '../database/connection';
import {
    Category,
    CategoryWithChildren,
    CategoryTree,
    CreateCategoryRequest,
    UpdateCategoryRequest
} from '../types';
import { AppError } from '../middleware/error.middleware';

/**
 * Category management service
 */
export class CategoryService {
    /**
     * Create a new category
     */
    public static async createCategory(categoryData: CreateCategoryRequest): Promise<Category> {
        // Check if category name already exists at the same level
        const existingResult = await EcommerceDatabase.query(
            'SELECT id FROM categories WHERE name = $1 AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))',
            [categoryData.name, categoryData.parentId || null]
        );

        if (existingResult.rows.length > 0) {
            throw new AppError('Category with this name already exists at this level', 409);
        }

        // If parent_id is provided, check if parent exists
        if (categoryData.parentId) {
            const parentResult = await EcommerceDatabase.query(
                'SELECT id FROM categories WHERE id = $1',
                [categoryData.parentId]
            );

            if (parentResult.rows.length === 0) {
                throw new AppError('Parent category not found', 404);
            }
        }

        const result = await EcommerceDatabase.query(`
            INSERT INTO categories (name, description, parent_id, image_url, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            categoryData.name,
            categoryData.description,
            categoryData.parentId || null,
            categoryData.imageUrl,
            categoryData.isActive ?? true
        ]);

        const category = result.rows[0];
        return {
            id: category.id,
            name: category.name,
            description: category.description,
            parentId: category.parent_id,
            imageUrl: category.image_url,
            isActive: category.is_active,
            createdAt: category.created_at,
            updatedAt: category.updated_at
        };
    }

    /**
     * Get category by ID
     */
    public static async getCategoryById(id: string): Promise<Category> {
        const result = await EcommerceDatabase.query(
            'SELECT * FROM categories WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            throw new AppError('Category not found', 404);
        }

        const category = result.rows[0];
        return {
            id: category.id,
            name: category.name,
            description: category.description,
            parentId: category.parent_id,
            imageUrl: category.image_url,
            isActive: category.is_active,
            createdAt: category.created_at,
            updatedAt: category.updated_at
        };
    }

    /**
     * Update category
     */
    public static async updateCategory(id: string, categoryData: UpdateCategoryRequest): Promise<Category> {
        // Check if category exists
        const existingCategory = await EcommerceDatabase.query(
            'SELECT * FROM categories WHERE id = $1',
            [id]
        );

        if (existingCategory.rows.length === 0) {
            throw new AppError('Category not found', 404);
        }

        // Check for name conflicts if name is being updated
        if (categoryData.name) {
            const conflictResult = await EcommerceDatabase.query(
                'SELECT id FROM categories WHERE name = $1 AND id != $2 AND (parent_id = $3 OR (parent_id IS NULL AND $3 IS NULL))',
                [categoryData.name, id, categoryData.parentId || existingCategory.rows[0].parent_id || null]
            );

            if (conflictResult.rows.length > 0) {
                throw new AppError('Category with this name already exists at this level', 409);
            }
        }

        // Prevent setting parent to self or descendant
        if (categoryData.parentId) {
            const isDescendant = await this.isDescendant(id, categoryData.parentId);
            if (categoryData.parentId === id || isDescendant) {
                throw new AppError('Cannot set parent to self or descendant category', 400);
            }
        }

        // Build update query dynamically
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        Object.entries(categoryData).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                updateFields.push(`${dbField} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
            }
        });

        if (updateFields.length === 0) {
            return await this.getCategoryById(id);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        await EcommerceDatabase.query(`
            UPDATE categories 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `, updateValues);

        return await this.getCategoryById(id);
    }

    /**
     * Delete category
     */
    public static async deleteCategory(id: string): Promise<void> {
        // Check if category has children
        const childrenResult = await EcommerceDatabase.query(
            'SELECT COUNT(*)::integer as count FROM categories WHERE parent_id = $1',
            [id]
        );

        if (childrenResult.rows[0].count > 0) {
            throw new AppError('Cannot delete category with subcategories', 400);
        }

        // Check if category has products
        const productsResult = await EcommerceDatabase.query(
            'SELECT COUNT(*)::integer as count FROM products WHERE category_id = $1',
            [id]
        );

        if (productsResult.rows[0].count > 0) {
            throw new AppError('Cannot delete category with products', 400);
        }

        const result = await EcommerceDatabase.query(
            'DELETE FROM categories WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            throw new AppError('Category not found', 404);
        }
    }

    /**
     * Get all categories as a tree structure
     */
    public static async getCategoryTree(includeInactive: boolean = false): Promise<CategoryTree> {
        const whereClause = includeInactive ? '' : 'WHERE is_active = true';

        const result = await EcommerceDatabase.query(`
            SELECT 
                c.*,
                COUNT(p.id)::integer as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
            ${whereClause}
            GROUP BY c.id
            ORDER BY c.name ASC
        `);

        const categories = result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            parentId: row.parent_id,
            imageUrl: row.image_url,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            productCount: row.product_count,
            children: [] as CategoryWithChildren[]
        }));

        // Build tree structure
        const categoryMap = new Map<string, CategoryWithChildren>();
        const rootCategories: CategoryWithChildren[] = [];

        // First pass: create map of all categories
        categories.forEach((category: any) => {
            categoryMap.set(category.id, category);
        });

        // Second pass: build parent-child relationships
        categories.forEach((category: any) => {
            if (category.parentId) {
                const parent = categoryMap.get(category.parentId);
                if (parent) {
                    parent.children.push(category);
                }
            } else {
                rootCategories.push(category);
            }
        });

        return { categories: rootCategories };
    }

    /**
     * Get categories by parent ID
     */
    public static async getCategoriesByParent(parentId?: string, includeInactive: boolean = false): Promise<CategoryWithChildren[]> {
        const whereConditions = ['(parent_id = $1 OR (parent_id IS NULL AND $1 IS NULL))'];
        const params = [parentId || null];

        if (!includeInactive) {
            whereConditions.push('is_active = true');
        }

        const result = await EcommerceDatabase.query(`
            SELECT 
                c.*,
                COUNT(p.id)::integer as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY c.id
            ORDER BY c.name ASC
        `, params);

        return result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            parentId: row.parent_id,
            imageUrl: row.image_url,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            productCount: row.product_count,
            children: []
        }));
    }

    /**
     * Get category path (breadcrumb)
     */
    public static async getCategoryPath(categoryId: string): Promise<Category[]> {
        const path: Category[] = [];
        let currentId: string | null = categoryId;

        while (currentId) {
            const result = await EcommerceDatabase.query(
                'SELECT * FROM categories WHERE id = $1',
                [currentId]
            );

            if (result.rows.length === 0) {
                break;
            }

            const category = result.rows[0];
            path.unshift({
                id: category.id,
                name: category.name,
                description: category.description,
                parentId: category.parent_id,
                imageUrl: category.image_url,
                isActive: category.is_active,
                createdAt: category.created_at,
                updatedAt: category.updated_at
            });

            currentId = category.parent_id;
        }

        return path;
    }

    /**
     * Search categories
     */
    public static async searchCategories(query: string, includeInactive: boolean = false): Promise<Category[]> {
        const whereConditions = ['(name ILIKE $1 OR description ILIKE $1)'];
        const params = [`%${query}%`];

        if (!includeInactive) {
            whereConditions.push('is_active = true');
        }

        const result = await EcommerceDatabase.query(`
            SELECT * FROM categories
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY name ASC
            LIMIT 50
        `, params);

        return result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            parentId: row.parent_id,
            imageUrl: row.image_url,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }

    /**
     * Check if a category is a descendant of another category
     */
    private static async isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
        const result = await EcommerceDatabase.query(`
            WITH RECURSIVE category_tree AS (
                SELECT id, parent_id, 1 as level
                FROM categories
                WHERE id = $1
                
                UNION ALL
                
                SELECT c.id, c.parent_id, ct.level + 1
                FROM categories c
                INNER JOIN category_tree ct ON c.parent_id = ct.id
                WHERE ct.level < 10 -- Prevent infinite recursion
            )
            SELECT COUNT(*)::integer as count
            FROM category_tree
            WHERE id = $2
        `, [descendantId, ancestorId]);

        return result.rows[0].count > 0;
    }

    /**
     * Get category statistics
     */
    public static async getCategoryStats(): Promise<{
        totalCategories: number;
        activeCategories: number;
        rootCategories: number;
        categoriesWithProducts: number;
    }> {
        const result = await EcommerceDatabase.query(`
            SELECT 
                COUNT(*)::integer as total_categories,
                COUNT(CASE WHEN is_active = true THEN 1 END)::integer as active_categories,
                COUNT(CASE WHEN parent_id IS NULL THEN 1 END)::integer as root_categories,
                COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN c.id END)::integer as categories_with_products
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
        `);

        const stats = result.rows[0];
        return {
            totalCategories: stats.total_categories,
            activeCategories: stats.active_categories,
            rootCategories: stats.root_categories,
            categoriesWithProducts: stats.categories_with_products
        };
    }
}