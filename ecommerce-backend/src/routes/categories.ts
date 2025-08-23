import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
    CreateCategorySchema,
    UpdateCategorySchema,
    CategoryParamsSchema
} from '../validation/category.validation';

const router = Router();

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Create a new category (admin only)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Category name already exists
 */
router.post('/',
    authenticateToken,
    requireAdmin,
    validate({ body: CreateCategorySchema }),
    CategoryController.createCategory
);

/**
 * @openapi
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree structure
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive categories
 *     responses:
 *       200:
 *         description: Category tree
 */
router.get('/tree',
    CategoryController.getCategoryTree
);

/**
 * @openapi
 * /api/categories/search:
 *   get:
 *     summary: Search categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Search query required
 */
router.get('/search',
    CategoryController.searchCategories
);

/**
 * @openapi
 * /api/categories/stats:
 *   get:
 *     summary: Get category statistics (admin only)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category statistics
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get('/stats',
    authenticateToken,
    requireAdmin,
    CategoryController.getCategoryStats
);

/**
 * @openapi
 * /api/categories/parent/{parentId}:
 *   get:
 *     summary: Get categories by parent ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent category ID or 'root' for top-level categories
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Child categories
 */
router.get('/parent/:parentId',
    CategoryController.getCategoriesByParent
);

/**
 * @openapi
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get('/:id',
    validate({ params: CategoryParamsSchema }),
    CategoryController.getCategory
);

/**
 * @openapi
 * /api/categories/{id}:
 *   put:
 *     summary: Update category (admin only)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name conflict
 */
router.put('/:id',
    authenticateToken,
    requireAdmin,
    validate({
        params: CategoryParamsSchema,
        body: UpdateCategorySchema
    }),
    CategoryController.updateCategory
);

/**
 * @openapi
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category (admin only)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with children or products
 *       404:
 *         description: Category not found
 */
router.delete('/:id',
    authenticateToken,
    requireAdmin,
    validate({ params: CategoryParamsSchema }),
    CategoryController.deleteCategory
);

/**
 * @openapi
 * /api/categories/{id}/path:
 *   get:
 *     summary: Get category path (breadcrumb)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category path from root to current category
 */
router.get('/:id/path',
    validate({ params: CategoryParamsSchema }),
    CategoryController.getCategoryPath
);

export default router;