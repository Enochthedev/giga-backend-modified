import { Response } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Advanced checkout controller
 */
export class CheckoutController {
    /**
     * Create checkout session
     */
    public static createCheckoutSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const session = await CheckoutService.createCheckoutSession(userId, req.body);

        res.status(201).json({
            success: true,
            data: session,
            message: 'Checkout session created successfully'
        });
    });

    /**
     * Get checkout session
     */
    public static getCheckoutSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { sessionId } = req.params;
        const userId = req.user!.id;
        const session = await CheckoutService.getCheckoutSession(sessionId, userId);

        res.json({
            success: true,
            data: session
        });
    });

    /**
     * Update checkout session
     */
    public static updateCheckoutSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { sessionId } = req.params;
        const userId = req.user!.id;
        const session = await CheckoutService.updateCheckoutSession(sessionId, userId, req.body);

        res.json({
            success: true,
            data: session,
            message: 'Checkout session updated successfully'
        });
    });

    /**
     * Complete checkout
     */
    public static completeCheckout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { sessionId } = req.params;
        const userId = req.user!.id;
        const order = await CheckoutService.completeCheckout(sessionId, userId);

        res.json({
            success: true,
            data: order,
            message: 'Checkout completed successfully'
        });
    });
}