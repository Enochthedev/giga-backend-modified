import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ProductService } from '../services/product.service';
import ProductSchema from '../validations/products.model.zod';

class ProductController {
    private productService: ProductService;

    constructor(productService: ProductService) {
        this.productService = productService;
    }

    public getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = ProductSchema.getPopularProductsSchema.parse(req.query);
            const response = await this.productService.getAllProducts(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error getting all products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        } 
    };

    public create = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = ProductSchema.createProductSchema.parse(req.body);
            //add cloudinary image upload here when ready
            const response = await this.productService.create(payload);
            res.status(response.status).json(response);
        } catch (error: any) {
            console.error('Error creating product:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public search = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = ProductSchema.searchSchema.parse(req.query);
            const response = await this.productService.search(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public update = async (req: Request, res: Response): Promise<void> => {
        try{
            const payload = ProductSchema.updateSchema.parse(req.body);
            //add cloudinary image upload here when ready
            const response = await this.productService.update(payload);
            res.status(response.status).json(response);

        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public remove = async (req: Request, res: Response): Promise<void> => {
        try{
            const payload = ProductSchema.removeSchema.parse(req.body);
            const response = await this.productService.remove(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public addReview = async (req: Request, res: Response): Promise<void> => {
        try{
            const payload = ProductSchema.addReviewSchema.parse(req.body);
            const response = await this.productService.addReview(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public removeReview = async (req: Request, res: Response): Promise<void> => {
        try{
            const payload = ProductSchema.removeReviewSchema.parse(req.body);
            const response = await this.productService.removeReview(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getProductRating = async (req: Request, res: Response): Promise<void> => {
        try{
            const payload = ProductSchema.getProductRatingSchema.parse(req.body);
            const response = await this.productService.getProductRating(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getProductReviews = async (req: Request, res: Response): Promise<void> => {
        try{
            const payload = ProductSchema.getProductReviewsSchema.parse(req.body);
            const response = await this.productService.getProductReviews(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getProduct = async (req: Request, res: Response): Promise<void> => {
        try{
            const payload = ProductSchema.getProductSchema.parse(req.body);
            const response = await this.productService.getProduct(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getPopularProducts = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = ProductSchema.getPopularProductsSchema.parse(req.body);
            const response = await this.productService.getPopularProducts(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error getting popular products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getNewProducts = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = ProductSchema.getNewProductsSchema.parse(req.body);
            const response = await this.productService.getNewProducts(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error getting new products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    };

    public getFeaturedProdcuts = async (req: Request, res: Response): Promise<void> => {
        try {
            const payload = ProductSchema.getPopularProductsSchema.parse(req.body);
            const response = await this.productService.getFeaturedProducts(payload);
            res.status(response.status).json(response);
        } catch (error:any) {
            console.error('Error getting featured products:', error.message);
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        } 
    };

    
}

export default ProductController;
