import { Request, Response } from 'express';
import { BookingModificationService, BookingModificationRequest } from '../services/booking-modification.service';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class BookingModificationController {
    private modificationService: BookingModificationService;

    constructor() {
        this.modificationService = new BookingModificationService();
    }

    /**
     * Modify an existing booking
     */
    modifyBooking = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const bookingId = req.params.bookingId;

            if (!userId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const modifications: BookingModificationRequest = {
                checkInDate: req.body.checkInDate,
                checkOutDate: req.body.checkOutDate,
                adults: req.body.adults ? parseInt(req.body.adults) : undefined,
                children: req.body.children !== undefined ? parseInt(req.body.children) : undefined,
                roomId: req.body.roomId,
                specialRequests: req.body.specialRequests
            };

            const result = await this.modificationService.modifyBooking(bookingId, userId, modifications);

            successResponse(res, result, 'Booking modified successfully');
        } catch (error) {
            logger.error('Error modifying booking:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ValidationError') {
                errorResponse(res, 400, 'VALIDATION_ERROR', error.message);
            } else if (error.name === 'ConflictError') {
                errorResponse(res, 409, 'CONFLICT', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to modify booking');
            }
        }
    };

    /**
     * Cancel a booking
     */
    cancelBooking = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const bookingId = req.params.bookingId;
            const { reason } = req.body;

            if (!userId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const result = await this.modificationService.cancelBooking(bookingId, userId, reason);

            successResponse(res, result, 'Booking cancelled successfully');
        } catch (error) {
            logger.error('Error cancelling booking:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ConflictError') {
                errorResponse(res, 409, 'CONFLICT', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to cancel booking');
            }
        }
    };

    /**
     * Get modification options for a booking
     */
    getModificationOptions = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const bookingId = req.params.bookingId;

            if (!userId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const options = await this.modificationService.getModificationOptions(bookingId, userId);

            successResponse(res, options, 'Modification options retrieved successfully');
        } catch (error) {
            logger.error('Error getting modification options:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get modification options');
            }
        }
    };

    /**
     * Get booking modification history
     */
    getModificationHistory = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const bookingId = req.params.bookingId;

            if (!userId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const history = await this.modificationService.getBookingModificationHistory(bookingId, userId);

            successResponse(res, { history }, 'Modification history retrieved successfully');
        } catch (error) {
            logger.error('Error getting modification history:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get modification history');
            }
        }
    };
}