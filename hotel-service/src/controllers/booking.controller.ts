import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { successResponse } from '../utils/response';

export class BookingController {
    private bookingService: BookingService;

    constructor() {
        this.bookingService = new BookingService();
    }

    createBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const booking = await this.bookingService.createBooking(req.user!.id, req.body);
            successResponse(res, booking, 'Booking created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const booking = await this.bookingService.getBookingById(id);

            // Check if user owns this booking or is the property owner
            if (booking.guestUserId !== req.user!.id) {
                // TODO: Add property owner check
                // For now, only allow guest to view their own booking
                return successResponse(res, null, 'Booking not found', 404);
            }

            successResponse(res, booking, 'Booking retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getUserBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const bookings = await this.bookingService.getUserBookings(req.user!.id);
            successResponse(res, bookings, 'User bookings retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getPropertyBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { propertyId } = req.params;
            const bookings = await this.bookingService.getPropertyBookings(propertyId, req.user!.id);
            successResponse(res, bookings, 'Property bookings retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateBookingStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            // For now, only allow guests to update their own bookings
            const booking = await this.bookingService.updateBookingStatus(id, status, req.user!.id);
            successResponse(res, booking, 'Booking status updated successfully');
        } catch (error) {
            next(error);
        }
    };

    cancelBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const booking = await this.bookingService.cancelBooking(id, req.user!.id, reason);
            successResponse(res, booking, 'Booking cancelled successfully');
        } catch (error) {
            next(error);
        }
    };

    updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { paymentStatus, paymentIntentId } = req.body;

            // This endpoint would typically be called by payment service
            const booking = await this.bookingService.updatePaymentStatus(id, paymentStatus, paymentIntentId);
            successResponse(res, booking, 'Payment status updated successfully');
        } catch (error) {
            next(error);
        }
    };
}