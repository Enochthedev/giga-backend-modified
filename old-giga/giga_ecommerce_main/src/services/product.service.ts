import SubCategory from "../models/general/subCategory.model";
import Category from "../models/general/category.model";
import Product from "../models/general/product.model";
import Review from "../models/users/reviews.model";
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import { Schema } from 'mongoose';



interface GetPopularProductsPayload {
    page?: number;
    limit?: number;
}

interface GetNewProductsPayload {
    page?: number;
    limit?: number;
}

interface GetProductReviewsPayload {
    page?: number;
    limit?: number;
    productId: Schema.Types.ObjectId | string;
}

interface GetProductRatingPayload {
    productId: Schema.Types.ObjectId | string;
}

interface createProductPayload {
    vendor: Schema.Types.ObjectId |string;
    productName: string;
    productDisplayName: string;
    productDescription: string;
    productCategory: Schema.Types.ObjectId |string;
    productSubCategory: Schema.Types.ObjectId |string;
    productImages: string[];
    productPrice: number;
    productAmountInStock: number;
    productFulfilmentTime: number;
}
interface RemoveReviewPayload {
    userId: Schema.Types.ObjectId | string;
    reviewId: Schema.Types.ObjectId | string;
}

interface GetProductPayload {
    reviewsPage?: number;
    reviewsLimit?: number;
    productId: Schema.Types.ObjectId | string;
}

interface AddReviewPayload {
    userId: Schema.Types.ObjectId| string;
    productId: Schema.Types.ObjectId| string;
    review: string;
    productRating?: number;
}

interface SearchPayload {
    page: number;
    limit: number;
    product?: string;
    rating?: number;
    sort?: string;
    category?: string;
    subCategory?: string;
    vendor?: string;
    minPrice?: number; 
    maxPrice?: number;
}

interface UpdatePayload {
    productId: Schema.Types.ObjectId | string;
    productName?: string;
    productDisplayName?: string;
    productDescription?: string;
    productCategory?: string;
    productSubCategory?: string;
    productImages?: string[];
    productPrice?: number;
    productAmountInStock?: number;
    productFulfilmentTime?: number;
}

interface RemovePayload {
    productId: Schema.Types.ObjectId| string;
}

interface GetAllProducts{
    page?:number,
    limit?:number
}

export class ProductService {
    public async create(payload: createProductPayload): Promise<ApiResponse<any>> {
        try {
            const { vendor, productName, productDisplayName, productDescription, productCategory, productSubCategory, productImages, productPrice, productAmountInStock, productFulfilmentTime } = payload;
            //extra edge cases 
            // if category does not exist
            const category = await Category.findById(productCategory);
            if (!category) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Category not found' });
            }
            // if subcategory does not exist
            const subCategory = await SubCategory.findById(productSubCategory);
            if (!subCategory) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Subcategory not found' });
            }
            //if vendor exists

            // Additional validation or business logic before creating the product
    
            const product = await Product.create({ vendor, productName, productDisplayName, productDescription, productCategory, productSubCategory, productImages, productPrice, productAmountInStock, productFulfilmentTime });

            // Additional logic after creating the product, if needed
            return new ApiResponse(httpStatus.CREATED, { success: true, data: product.toObject() }); // 201 Created status
        } catch (error:any) {
            console.error('Error creating product:', error.message);
    
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async search(payload: SearchPayload): Promise<ApiResponse<any>> {
        const { page = 1, limit = 10, product = '', rating = 0, sort = '', category = 'All', subCategory = 'All', vendor = '', minPrice = 0, maxPrice = Infinity } = payload;

        const skip = (page - 1) * limit;

        const query: any = {};

        if (product) {
            // Use a regular expression for case-insensitive fuzzy search by name
            query.productName = { $regex: new RegExp(product, 'i') };
        }

        if (rating > 0) {
            query.productRating = { $gte: rating };
        }

        if (category !== 'All') {
            query.productCategory = category;
        }

        if (subCategory !== 'All') {
            query.productSubCategory = subCategory;
        }

        if (vendor) {
            // Assuming vendor is the vendor name
            query.vendor = vendor;
        }

        query.productPrice = { $gte: minPrice, $lte: maxPrice };

        let sortOptions: any = {}
        
        if (sort === 'price') {
            sortOptions.productPrice = 1; // Ascending order for price
        } else if (sort === '-price') {
            sortOptions.productPrice = -1; // Descending order for price
        }

        try {
            const totalDocs = await Product.countDocuments(query);
            const results = await Product.find(query)
                .skip(skip)
                .limit(limit)
                .sort(sort)
                .populate('productCategory', 'categoryName') // Assuming 'categoryName' is the field to be populated
                .populate('productSubCategory', 'subCategoryName'); // Assuming 'subCategoryName' is the field to be populated

            const totalPages = Math.ceil(totalDocs / limit);
            const response = {
                success: true,
                data: {
                    results,
                    totalPages,
                    currentPage: page,
                    totalResults: totalDocs,
                },
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error searching products:', error.message);

            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' });
        }
    }

    public async update(payload: UpdatePayload): Promise<ApiResponse<any>> {
        try {
            const { productId, ...updateFields } = payload;

            // Find the product by ID
            const product = await Product.findById(productId);

            if (!product) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Product not found' });
            }

            // Update the product fields based on the payload
            for (const [key, value] of Object.entries(updateFields)) {
                if (value !== undefined) {
                    // Only update fields that are defined in the payload
                    product[key] = value;
                }
            }

            // Save the updated product
            await product.save();

            const updatedProduct = await Product.findById(productId);

            // Additional logic or formatting of the updated product if needed
            const response = {
                success: true,
                data: updatedProduct,
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error updating product:', error.message);

            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' });
        }
    }

    public async remove(payload: RemovePayload): Promise<ApiResponse<any>> {
        try {
            const { productId } = payload;

            // Find the product by ID
            const product = await Product.findById(productId);

            if (!product) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Product not found' });
            }

            // Remove the product
            await product.remove();

            const response = {
                success: true,
                message: 'Product removed successfully',
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error:any) {
            console.error('Error removing product:', error.message);

            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { success: false, error: 'Internal server error' });
        }
    }

    public async addReview(payload: AddReviewPayload): Promise<ApiResponse<any>> {
        try {
            const { userId, productId, review, productRating = '0' } = payload;
    
            // Check if the product exists
            const product = await Product.findById(productId);
            if (!product) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Product not found' });
            }
    
            // Additional validation or business logic before creating the review
    
            const reviewObj = await Review.create({ userId, productId, review, productRating });
    
            // Update product rating
            // (Assuming you've implemented the logic to automatically update the product rating)
    
            const response = {
                success: true,
                message: 'Review created successfully',
                data: reviewObj,
            };
    
            // Additional logic after creating the review, if needed
            return new ApiResponse(httpStatus.CREATED, response); // 201 Created status
        } catch (error: any) {
            console.error('Error creating review:', error.message);
    
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else if (error.name === 'ValidationError') {
                // Handle validation errors (e.g., required fields missing)
                return new ApiResponse(httpStatus.BAD_REQUEST, { error: 'Validation error', details: error.errors });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async removeReview(payload: RemoveReviewPayload): Promise<ApiResponse<any>> {
        try {
            const { userId, reviewId } = payload;
    
            // Check if the review exists
            const review = await Review.findOne({ _id: reviewId, userId });
            if (!review) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Review not found' });
            }
    
            // Remove the review
            await review.remove();
    
            const response = {
                success: true,
                message: 'Review removed successfully',
            };
    
            return new ApiResponse(httpStatus.OK, response); // 200 OK status
        } catch (error: any) {
            console.error('Error removing review:', error.message);
    
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getProductRating(payload: GetProductRatingPayload): Promise<ApiResponse<any>> {
        try {
            const { productId } = payload;
    
            // Check if the product exists
            const product = await Product.findById(productId);
            if (!product) {
                return new ApiResponse(httpStatus.NOT_FOUND, { success: false, error: 'Product not found' });
            }
    
            // Get the average rating from the product
            const averageRating = product.productRating;
    
            const response = {
                success: true,
                averageRating,
            };
    
            return new ApiResponse(httpStatus.OK, response); // 200 OK status
        } catch (error: any) {
            console.error('Error getting product rating:', error.message);
    
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getProductReviews(payload: GetProductReviewsPayload): Promise<ApiResponse<any>> {
        try {
            const { page = 1, limit= 10, productId } = payload;
    
            // Get reviews for the specified product with pagination
            const reviews = await Review.find({ productId })
                .sort({ createdAt: -1 }) // Sort by creation date in descending order
                .skip((page - 1) * limit)
                .limit(limit);
    
            // Get the total number of reviews for the product
            const totalReviews = await Review.countDocuments({ productId });
    
            const response = {
                success: true,
                reviews,
                totalReviews,
            };
    
            return new ApiResponse(httpStatus.OK, response); // 200 OK status
        } catch (error: any) {
            console.error('Error getting product reviews:', error.message);
    
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getProduct(payload: GetProductPayload): Promise<ApiResponse<any>> {
        try {
            const { productId, reviewsPage = 1, reviewsLimit = 4 } = payload;
    
            // Get the product details, including reviews,  vendor, and items in category and subcategory
            const product = await Product.findById(productId)
            .populate('productCategory') // Populate category
            .populate('productSubCategory') // Populate subcategory
            .populate({
                path: 'reviews',
                options: { page: reviewsPage, limit: reviewsLimit },
            }) // Populate reviews with pagination
            .populate('vendor') // Populate vendor
            .populate({
                path: 'items',
                populate: [
                    { path: 'productId', model: 'Product' }, // Assuming 'items' have a 'productId' field referring to 'Product'
                ],
            })
            .exec();

            if (!product) {
                return new ApiResponse(httpStatus.NOT_FOUND, { error: 'Product not found' });
            }
    
            const response = {
                success: true,
                product,
            };
    
            return new ApiResponse(httpStatus.OK, response); // 200 OK status
        } catch (error: any) {
            console.error('Error getting product:', error.message);
    
            if (error instanceof ApiError) {
                // Handle specific ApiError instances
                return new ApiResponse(error.statusCode, { error: error.message });
            } else {
                // Handle other errors
                return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
            }
        }
    }

    public async getPopularProducts(payload: GetPopularProductsPayload): Promise<ApiResponse<any>> {
        try {
            const { page = 1, limit = 10 } = payload;

            const averageSales = await Product.getHighestSales()/2;//get the average sales of all products
            const minSalesThreshold = Math.ceil(averageSales * (1 / 3));//get the minimum sales threshold
            
            // Use the query criteria in the find method
            const queryCriteria = {
                // Example: Get products with sales greater than the minimum threshold
                sales: { $gt: minSalesThreshold },
                // You can add additional criteria if needed
                rating: { $gt: 3.5 },
            };

            const popularProducts = await Product.find({ ...queryCriteria })
                .sort({ sales: -1, productRating: -1 }) // Sort by sales (descending) and then by ratings (descending)
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('productCategory', 'categoryName') // Assuming 'categoryName' is the field to be populated;

            const response = {
                success: true,
                data: popularProducts,
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error: any) {
            console.error('Error getting popular products:', error.message);
            // Handle errors and return an appropriate ApiResponse
            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
        }
    }

    public async getNewProducts(payload: GetNewProductsPayload): Promise<ApiResponse<any>> {
        try {
            const { page = 1, limit = 10 } = payload;

            const newProducts = await Product.find()
                .sort({ createdAt: -1 }) // Sort by creation date in descending order
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('productCategory', 'categoryName') // Assuming 'categoryName' is the field to be populated;

            const response = {
                success: true,
                data: newProducts,
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error: any) {
            console.error('Error getting new products:', error.message);
            // Handle errors and return an appropriate ApiResponse
            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
        }
    }

    public async getFeaturedProducts(payload: GetPopularProductsPayload): Promise<ApiResponse<any>> {
        try {
            const { page = 1, limit = 10 } = payload;

            const featuredProducts = await Product.find({ featured: true })
                .sort({ createdAt: -1 }) // Sort by creation date in descending order
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('productCategory', 'categoryName') // Assuming 'categoryName' is the field to be populated;

            const response = {
                success: true,
                data: featuredProducts,
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error: any) {
            console.error('Error getting featured products:', error.message);
            // Handle errors and return an appropriate ApiResponse
            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
        }
    }

    public async getAllProducts(payload:GetAllProducts): Promise<ApiResponse<any>> {
        try {
            const {page= 1, limit=10}= payload;
            const skip = (page - 1) * limit;

            const products = await Product.find()
            .skip(skip)
            .limit(limit)
            .populate('productCategory', 'categoryName') 
            .populate('productSubCategory', 'subCategoryName'); 


            const totalDocs = products.length 
            const totalPages = Math.ceil(totalDocs / limit);
            const response = {
                success: true,
                data: {
                    products,
                    totalPages,
                    currentPage: page,
                    totalResults: totalDocs
                }
            };

            return new ApiResponse(httpStatus.OK, response);
        } catch (error: any) {
            console.error('Error getting all products:', error.message);
            // Handle errors and return an appropriate ApiResponse
            return new ApiResponse(httpStatus.INTERNAL_SERVER_ERROR, { error: 'Internal server error' });
        }
    }

}

export default new ProductService();





