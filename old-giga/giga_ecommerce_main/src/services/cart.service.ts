import Cart from '../models/users/cart.model';
import { EventSender } from '../utils/eventSystem';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import httpStatus from 'http-status';
import { Types, Schema, get, ObjectId } from 'mongoose';

interface CartItemPayload {
    productId: Schema.Types.ObjectId | string;
    quantity: number;
    price: number;
}

interface UpdateCartPayload {
    userId: string;
    cartItems: CartItemPayload[];
}

interface CreateCartPayload {
    userId: string;
}

interface GetCartPayload {
    userId: string;
    page?: number;
    limit?: number;
}

interface GetAllCartsPayload{
    page?: number;
    limit?: number;
}

interface DeleteCartPayload {
    userId: string;
}

interface AddCartItemPayload {
    userId: string;
    productId: Schema.Types.ObjectId;
    quantity: number;
    price: number;
}
interface RemoveCartItemPayload {
    userId: string;
    productId: Schema.Types.ObjectId;
    quantity: number;
}

interface CheckoutPayload {
    userId: string;
    paymentMethod: string;
    shippingAddress: string;
}

export class CartService {
    private eventSender: EventSender;

    constructor(eventSender: EventSender) {
        this.eventSender = eventSender;
    }

    public async createCart(payload: CreateCartPayload): Promise<ApiResponse<any>> {
        try{
            const { userId } = payload;
            //check if cart with userId exists
            const existingCart = await Cart.findOne({ userId });
            if (existingCart) {
                const existingCart = this.getCartByUserId({ userId }); // Fix: Pass userId as an object
                return existingCart;
            }
            //create new cart
            const cart = await Cart.create(payload);
            //populate cart with items
            const populatedCart = await Cart.populate(cart, 'items.productId');
            //return empty class with populated items
            const response ={
                success: true,
                data: {
                    message: 'Cart created successfully',
                    cart: populatedCart
                }
            }
            return new ApiResponse(httpStatus.CREATED, response);
        }catch(error:any){
            console.error('Error creating cart:', error.message);
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

    public async updateCart(payload:UpdateCartPayload): Promise<ApiResponse<any>> {
        try{
            const { userId, cartItems } = payload;
            let cart = await Cart.findOne({ userId });

            if (!cart) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
            }

            // Update cart items based on the payload
            for (const cartItem of cartItems) {
                let { productId, quantity, price } = cartItem;
                // Find the cart item with the specified productId, if it exists the productId will be an object id
                const existingItem = cart.items.find(item => item.productId.toString() === productId.toString());
                if (existingItem) {
                    // If the product already exists, update the quantity
                    existingItem.quantity = quantity;
                } else {
                    productId = productId as Schema.Types.ObjectId;
                    // If the product doesn't exist, add a new item
                    cart.items.push({ productId, quantity, price });
                }
            }
            // Save the updated cart
            await cart.save();
            //return populated cart and response message that cart was updated
            const populatedCart = await Cart.populate(cart, 'items.productId');
            const response ={
                success: true,
                data: {
                    message: 'Cart updated successfully',
                    cart: populatedCart
                }
            }
            return new ApiResponse(httpStatus.CREATED, response);
        }catch(error:any){
            console.error('Error updating cart:', error.message);
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

    public async clearCart(userId: string): Promise<ApiResponse<any>> {
        try{
            const cart = await Cart.findOne({ userId });
            if (!cart) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
            }
    
            //remove all items from cart
            cart.items = [];
    
            // Save the updated cart
            await cart.save();
            //on success return the cart with message cart cleared
            const response ={
                success: true,
                data: {
                    message: 'Cart cleared successfully',
                    cart: cart
                }
            }
            return new ApiResponse(httpStatus.CREATED, response);
        }catch(error:any){
            console.error('Error removing subcategory from category:', error.message);
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

    public async getCartByUserId(payload:GetCartPayload): Promise<ApiResponse<any>> {
        try{
            const { userId, page = 1, limit = 10 } = payload;

            //check if cart with userId exists
            let response;
            const existingCart = await Cart.findOne({ userId });
            if (!existingCart) {
                const newCart = await Cart.create(userId);
                response ={
                    success: true,
                    data: {
                        message: 'New cart created, empty cart returned',
                        cart: newCart
                    }
                }
                return new ApiResponse(httpStatus.CREATED, response);
            }
    
            // Get cart from the db and then populate the items while applying pagination to the items
            const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                select: 'productName productPrice',
                options: { limit, skip: (page - 1) * limit },
            })
            .lean();  
            
            // Return the cart
            response ={
                success: true,
                data: {
                    message: 'Cart retrieved successfully',
                    cart: cart
                }
            }
            return new ApiResponse(httpStatus.CREATED, response);

        }catch(error:any){
            console.error('Error getting cart by userId:', error.message);
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

    public async getAllCarts(payload:GetAllCartsPayload): Promise<ApiResponse<any>> {
        try{
            const { page = 1, limit = 10 } = payload;
            const carts = await Cart.find()
            .populate({
                path: 'items.productId',
                select: 'productName productPrice',
                options: { limit, skip: (page - 1) * limit },
            })
            .lean();
            // get the amount of items in the cart
            const totalItems = await Cart.countDocuments();

            //return the carts with pagination
            const response ={
                success: true,
                data: {
                    message: 'Carts retrieved successfully',
                    carts: carts,
                    meta: {
                        totalItems,
                        page,
                        totalPages: Math.ceil(totalItems / limit),
                    },
                }
            }
            return new ApiResponse(httpStatus.CREATED, response);
        }catch(error:any){
            console.error('Error getting all carts:', error.message);
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

    public async removeCartItem(payload:DeleteCartPayload): Promise<ApiResponse<any>> {
        try{
            const { userId } = payload;
            let cart = await Cart.findOne({ userId });

            if (!cart) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
            }

            //remove all items from cart
            cart.items = [];

            // Save the updated cart
            await cart.save();
            //on success return the cart with message cart cleared
            const response ={
                success: true,
                data: {
                    message: 'Cart cleared successfully',
                    cart: cart
                }
            }
            return new ApiResponse(httpStatus.CREATED, response);
        }catch(error:any){
            console.error('Error removing subcategory from category:', error.message);
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

    public async checkout(payload: CheckoutPayload): Promise<ApiResponse<any>> {
        try{
            const { userId, paymentMethod, shippingAddress } = payload;
            let cart = await Cart.findOne({ userId });

            if (!cart) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
            }

            //get the total price of the cart
            const totalPrice = cart.getTotalPrice();

            //use emmiter to send event to payment service
            this.eventSender.sendEvent({
                service: 'payment',
                name: 'createPayment',
                payload: { userId, totalPrice, paymentMethod, shippingAddress },
            });
            
        }catch(error:any){
            console.error('Error checking out:', error.message);
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

    
}

export default new CartService(new EventSender());
