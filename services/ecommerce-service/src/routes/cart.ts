import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
    AddToCartSchema,
    UpdateCartItemSchema,
    CartParamsSchema,
    CartItemParamsSchema,
    GuestCartSessionSchema
} from '../validation/cart.validation';

const router = Router();

/**
 * @openapi
 * /api/cart:
 *   get:
 *     summary: Get or create shopping cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *         description: Session ID for guest users
 *     responses:
 *       200:
 *         description: Shopping cart
 */
router.get('/',
    optionalAuth,
    CartController.getCart
);

/**
 * @openapi
 * /api/cart/guest-session:
 *   post:
 *     summary: Create guest cart session
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Guest session created
 */
router.post('/guest-session',
    CartController.createGuestSession
);

/**
 * @openapi
 * /api/cart/merge:
 *   post:
 *     summary: Merge guest cart with user cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Carts merged successfully
 *       401:
 *         description: Authentication required
 */
router.post('/merge',
    authenticateToken,
    validate({ body: GuestCartSessionSchema }),
    CartController.mergeGuestCart
);

/**
 * @openapi
 * /api/cart/{cartId}/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
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
 *             required:
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               variantId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 999
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Product not found
 */
router.post('/:cartId/items',
    validate({
        params: CartParamsSchema,
        body: AddToCartSchema
    }),
    CartController.addToCart
);

/**
 * @openapi
 * /api/cart/{cartId}/items/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
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
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 999
 *     responses:
 *       200:
 *         description: Cart item updated
 *       404:
 *         description: Cart item not found
 */
router.put('/:cartId/items/:itemId',
    validate({
        params: CartItemParamsSchema,
        body: UpdateCartItemSchema
    }),
    CartController.updateCartItem
);

/**
 * @openapi
 * /api/cart/{cartId}/items/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Item removed from cart
 *       404:
 *         description: Cart item not found
 */
router.delete('/:cartId/items/:itemId',
    validate({ params: CartItemParamsSchema }),
    CartController.removeCartItem
);

/**
 * @openapi
 * /api/cart/{cartId}/clear:
 *   post:
 *     summary: Clear all items from cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.post('/:cartId/clear',
    validate({ params: CartParamsSchema }),
    CartController.clearCart
);

/**
 * @openapi
 * /api/cart/{cartId}/summary:
 *   get:
 *     summary: Get cart summary with totals
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cart summary
 */
router.get('/:cartId/summary',
    validate({ params: CartParamsSchema }),
    CartController.getCartSummary
);

export default router;