import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticateToken, requireCustomerOrAdmin, requireAdmin } from '../middleware/auth.middleware';
import { validateUUIDParam, validatePagination } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const paymentController = new PaymentController();

// Health check endpoint (public)
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                     service:
 *                       type: string
 *                     version:
 *                       type: string
 */
router.get('/health', asyncHandler(paymentController.healthCheck));

// Webhook endpoints (public, but signature verified)
/**
 * @openapi
 * /webhooks/stripe:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature or payload
 */
router.post('/webhooks/stripe', asyncHandler(paymentController.handleStripeWebhook));

// Payment Intent endpoints
/**
 * @openapi
 * /payment-intents:
 *   post:
 *     summary: Create a payment intent
 *     tags: [Payment Intents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - serviceName
 *               - serviceTransactionId
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 999999.99
 *               currency:
 *                 type: string
 *                 default: USD
 *               serviceName:
 *                 type: string
 *                 maxLength: 100
 *               serviceTransactionId:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               metadata:
 *                 type: object
 *               paymentMethodId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Payment intent created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/payment-intents',
  authenticateToken,
  requireCustomerOrAdmin,
  asyncHandler(paymentController.createPaymentIntent)
);

// Payment processing endpoints
/**
 * @openapi
 * /payments:
 *   post:
 *     summary: Process a payment
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 format: uuid
 *               paymentMethodId:
 *                 type: string
 *                 format: uuid
 *               confirmationToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Payment declined or insufficient funds
 */
router.post('/payments',
  authenticateToken,
  requireCustomerOrAdmin,
  asyncHandler(paymentController.processPayment)
);

/**
 * @openapi
 * /payments:
 *   get:
 *     summary: Get user transactions
 *     tags: [Payments]
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
 *           enum: [pending, processing, succeeded, failed, cancelled, refunded]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [payment, refund, payout]
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [stripe, paypal, flutterwave, paystack]
 *       - in: query
 *         name: serviceName
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/payments',
  authenticateToken,
  requireCustomerOrAdmin,
  validatePagination,
  asyncHandler(paymentController.getUserTransactions)
);

/**
 * @openapi
 * /payments/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Payments]
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
 *         description: Transaction retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.get('/payments/:id',
  authenticateToken,
  requireCustomerOrAdmin,
  validateUUIDParam('id'),
  asyncHandler(paymentController.getTransactionById)
);

// Refund endpoints
/**
 * @openapi
 * /refunds:
 *   post:
 *     summary: Create a refund
 *     tags: [Refunds]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               reason:
 *                 type: string
 *                 maxLength: 255
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Refund created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.post('/refunds',
  authenticateToken,
  requireCustomerOrAdmin,
  asyncHandler(paymentController.createRefund)
);

// Payment Method endpoints
/**
 * @openapi
 * /payment-methods:
 *   post:
 *     summary: Add a payment method
 *     tags: [Payment Methods]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [card, bank_account, digital_wallet]
 *               provider:
 *                 type: string
 *                 enum: [stripe, paypal, flutterwave, paystack]
 *                 default: stripe
 *               providerPaymentMethodId:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Payment method added successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/payment-methods',
  authenticateToken,
  requireCustomerOrAdmin,
  asyncHandler(paymentController.addPaymentMethod)
);

/**
 * @openapi
 * /payment-methods:
 *   get:
 *     summary: Get user payment methods
 *     tags: [Payment Methods]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/payment-methods',
  authenticateToken,
  requireCustomerOrAdmin,
  asyncHandler(paymentController.getUserPaymentMethods)
);

// Admin endpoints
/**
 * @openapi
 * /admin/statistics:
 *   get:
 *     summary: Get payment statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/admin/statistics',
  authenticateToken,
  requireAdmin,
  asyncHandler(paymentController.getPaymentStatistics)
);

export default router;
