import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Product controller
 */
export class ProductController {
    /**
     * Create a new product
     */
    public static createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const vendorId = req.user!.id;
        const product = await ProductService.createProduct(req.body, vendorId);

        res.status(201).json({
            success: true,
            data: product,
            message: 'Product created successfully'
        });
    });

    /**
     * Get product by ID
     */
    public static getProduct = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const product = await ProductService.getProductById(id);

        res.json({
            success: true,
            data: product
        });
    });

    /**
     * Update product
     */
    public static updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const vendorId = req.user!.id;
        const product = await ProductService.updateProduct(id, req.body, vendorId);

        res.json({
            success: true,
            data: product,
            message: 'Product updated successfully'
        });
    });

    /**
     * Delete product
     */
    public static deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const vendorId = req.user!.id;
        await ProductService.deleteProduct(id, vendorId);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    });

    /**
     * Search products
     */
    public static searchProducts = asyncHandler(async (req: Request, res: Response) => {
        const result = await ProductService.searchProducts(req.query as any);

        res.json({
            success: true,
            data: result.products,
            pagination: result.pagination,
            filters: result.filters
        });
    });

    /**
     * Get vendor products
     */
    public static getVendorProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const vendorId = req.user!.id;
        const result = await ProductService.getProductsByVendor(vendorId, req.query as any);

        res.json({
            success: true,
            data: result.products,
            pagination: result.pagination
        });
    });
}