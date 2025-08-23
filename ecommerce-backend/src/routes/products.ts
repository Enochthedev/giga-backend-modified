import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken, requireVendorOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
    CreateProductSchema,
    UpdateProductSchema,
    ProductSearchSchema,
    ProductParamsSchema
} from '../validation/product.validation';

const router = Router();

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Create a new product (vendor/admin only)
 *     tags: [Products]
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
 *               - sku
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *               sku:
 *                 type: string
 *                 maxLength: 100
 *               price:
 *                 type: number
 *                 minimum: 0
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               brand:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       format: uri
 *                     alt:
 *                       type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Vendor/admin access required
 */
router.post('/',
    authenticateToken,
    requireVendorOrAdmin,
    validate({ body: CreateProductSchema }),
    ProductController.createProduct
);

/**
 * @openapi
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, price, createdAt, updatedAt, rating]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Search results with pagination and filters
 */
router.get('/search',
    validate({ query: ProductSearchSchema }),
    ProductController.searchProducts
);

/**
 * @openapi
 * /api/products/vendor/me:
 *   get:
 *     summary: Get current vendor's products
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Vendor products
 *       401:
 *         description: Authentication required
 */
router.get('/vendor/me',
    authenticateToken,
    requireVendorOrAdmin,
    validate({ query: ProductSearchSchema }),
    ProductController.getVendorProducts
);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id',
    validate({ params: ProductParamsSchema }),
    ProductController.getProduct
);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     summary: Update product (vendor/admin only)
 *     tags: [Products]
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
 *               price:
 *                 type: number
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       403:
 *         description: Not authorized to update this product
 *       404:
 *         description: Product not found
 */
router.put('/:id',
    authenticateToken,
    requireVendorOrAdmin,
    validate({
        params: ProductParamsSchema,
        body: UpdateProductSchema
    }),
    ProductController.updateProduct
);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product (vendor/admin only)
 *     tags: [Products]
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
 *         description: Product deleted successfully
 *       403:
 *         description: Not authorized to delete this product
 *       404:
 *         description: Product not found
 */
router.delete('/:id',
    authenticateToken,
    requireVendorOrAdmin,
    validate({ params: ProductParamsSchema }),
    ProductController.deleteProduct
);

export default router;