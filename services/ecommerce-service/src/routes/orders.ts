import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  CreateOrderSchema,
  UpdateOrderSchema,
  OrderSearchSchema,
  OrderParamsSchema
} from '../validation/order.validation';

const router = Router();

/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cartId:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     variantId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *               billingAddress:
 *                 type: object
 *               shippingAddress:
 *                 type: object
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 */
router.post('/',
  authenticateToken,
  validate({ body: CreateOrderSchema }),
  OrderController.createOrder
);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
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
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id',
  authenticateToken,
  validate({ params: OrderParamsSchema }),
  OrderController.getOrder
);

/**
 * @openapi
 * /api/orders/{id}:
 *   put:
 *     summary: Update order (admin/vendor only)
 *     tags: [Orders]
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
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded, partially_refunded]
 *               fulfillmentStatus:
 *                 type: string
 *                 enum: [unfulfilled, partial, fulfilled, shipped, delivered]
 *               trackingNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       403:
 *         description: Not authorized
 */
router.put('/:id',
  authenticateToken,
  validate({
    params: OrderParamsSchema,
    body: UpdateOrderSchema
  }),
  OrderController.updateOrder
);

/**
 * @openapi
 * /api/orders/user/me:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *     responses:
 *       200:
 *         description: User orders
 */
router.get('/user/me',
  authenticateToken,
  validate({ query: OrderSearchSchema }),
  OrderController.getUserOrders
);

/**
 * @openapi
 * /api/orders/search:
 *   get:
 *     summary: Search all orders (admin only)
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: orderNumber
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 *       403:
 *         description: Admin access required
 */
router.get('/search',
  authenticateToken,
  requireAdmin,
  validate({ query: OrderSearchSchema }),
  OrderController.searchOrders
);

/**
 * @openapi
 * /api/orders/summary:
 *   get:
 *     summary: Get order summary statistics
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Order summary
 */
router.get('/summary',
  authenticateToken,
  OrderController.getOrderSummary
);

/**
 * @openapi
 * /api/orders/{id}/tracking:
 *   post:
 *     summary: Add tracking information to order
 *     tags: [Orders]
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
 *               trackingNumber:
 *                 type: string
 *               carrier:
 *                 type: string
 *               trackingUrl:
 *                 type: string
 *               estimatedDelivery:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Tracking information added successfully
 */
router.post('/:id/tracking',
  authenticateToken,
  validate({ params: OrderParamsSchema }),
  OrderController.addTrackingInfo
);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status with history
 *     tags: [Orders]
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
 *               status:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *               fulfillmentStatus:
 *                 type: string
 *               notes:
 *                 type: string
 *               notifyCustomer:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.put('/:id/status',
  authenticateToken,
  validate({ params: OrderParamsSchema }),
  OrderController.updateOrderStatus
);

/**
 * @openapi
 * /api/orders/{id}/tracking-history:
 *   get:
 *     summary: Get order tracking history
 *     tags: [Orders]
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
 *         description: Order tracking history
 */
router.get('/:id/tracking-history',
  authenticateToken,
  validate({ params: OrderParamsSchema }),
  OrderController.getOrderTrackingHistory
);

/**
 * @openapi
 * /api/orders/track/{trackingNumber}:
 *   get:
 *     summary: Track order by tracking number
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order tracking information
 */
router.get('/track/:trackingNumber',
  authenticateToken,
  OrderController.trackOrderByNumber
);

export default router;
