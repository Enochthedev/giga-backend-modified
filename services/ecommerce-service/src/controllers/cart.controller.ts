import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Shopping cart controller
 */
export class CartController {
    /**
     * Get or create cart
     */
    public static getCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user?.id;
        const sessionId = req.headers['x-session-id'] as string;

        const cart = await CartService.getOrCreateCart(userId, sessionId);

        res.json({
            success: true,
            data: cart
        });
    });

    /**
     * Add item to cart
     */
    public static addToCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { cartId } = req.params;
        const cart = await CartService.addToCart(cartId, req.body);

        res.json({
            success: true,
            data: cart,
            message: 'Item added to cart successfully'
        });
    });

    /**
     * Update cart item
     */
    public static updateCartItem = asyncHandler(async (req: Request, res: Response) => {
        const { cartId, itemId } = req.params;
        const cart = await CartService.updateCartItem(cartId, itemId, req.body);

        res.json({
            success: true,
            data: cart,
            message: 'Cart item updated successfully'
        });
    });

    /**
     * Remove cart item
     */
    public static removeCartItem = asyncHandler(async (req: Request, res: Response) => {
        const { cartId, itemId } = req.params;
        const cart = await CartService.removeCartItem(cartId, itemId);

        res.json({
            success: true,
            data: cart,
            message: 'Item removed from cart successfully'
        });
    });

    /**
     * Clear cart
     */
    public static clearCart = asyncHandler(async (req: Request, res: Response) => {
        const { cartId } = req.params;
        const cart = await CartService.clearCart(cartId);

        res.json({
            success: true,
            data: cart,
            message: 'Cart cleared successfully'
        });
    });

    /**
     * Get cart summary
     */
    public static getCartSummary = asyncHandler(async (req: Request, res: Response) => {
        const { cartId } = req.params;
        const summary = await CartService.getCartSummary(cartId);

        res.json({
            success: true,
            data: summary
        });
    });

    /**
     * Create guest session
     */
    public static createGuestSession = asyncHandler(async (_req: Request, res: Response) => {
        const session = await CartService.createGuestSession();

        res.json({
            success: true,
            data: session
        });
    });

    /**
     * Merge guest cart with user cart
     */
    public static mergeGuestCart = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const { sessionId } = req.body;

        const cart = await CartService.mergeGuestCart(userId, sessionId);

        res.json({
            success: true,
            data: cart,
            message: 'Guest cart merged successfully'
        });
    });
}