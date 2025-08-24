import { Request, Response } from 'express';
import { AvailabilityCalendarService, AvailabilityUpdate, BulkAvailabilityUpdate } from '../services/availability-calendar.service';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class AvailabilityCalendarController {
    private calendarService: AvailabilityCalendarService;

    constructor() {
        this.calendarService = new AvailabilityCalendarService();
    }

    /**
     * Get availability calendar for a room
     */
    getCalendar = async (req: Request, res: Response): Promise<void> => {
        try {
            const roomId = req.params.roomId;
            const startDate = new Date(req.query.startDate as string);
            const endDate = new Date(req.query.endDate as string);
            const ownerId = req.user?.id; // Optional for public view

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            if (startDate >= endDate) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'End date must be after start date');
                return;
            }

            // Limit date range to prevent excessive queries
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 365) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Date range cannot exceed 365 days');
                return;
            }

            const calendar = await this.calendarService.getCalendar(roomId, startDate, endDate, ownerId);

            successResponse(res, { calendar }, 'Calendar retrieved successfully');
        } catch (error) {
            logger.error('Error getting calendar:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get calendar');
            }
        }
    };

    /**
     * Update room availability
     */
    updateAvailability = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const updates: AvailabilityUpdate[] = req.body.updates;

            if (!Array.isArray(updates) || updates.length === 0) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Updates array is required');
                return;
            }

            // Validate updates
            for (const update of updates) {
                if (!update.roomId || !update.date) {
                    errorResponse(res, 400, 'VALIDATION_ERROR', 'Each update must have roomId and date');
                    return;
                }

                if (update.availableCount !== undefined && update.availableCount < 0) {
                    errorResponse(res, 400, 'VALIDATION_ERROR', 'Available count cannot be negative');
                    return;
                }

                if (update.price !== undefined && update.price < 0) {
                    errorResponse(res, 400, 'VALIDATION_ERROR', 'Price cannot be negative');
                    return;
                }
            }

            const results = await this.calendarService.updateAvailability(updates, ownerId);

            successResponse(res, { updates: results }, 'Availability updated successfully');
        } catch (error) {
            logger.error('Error updating availability:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ValidationError') {
                errorResponse(res, 400, 'VALIDATION_ERROR', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to update availability');
            }
        }
    };

    /**
     * Bulk update availability for a date range
     */
    bulkUpdateAvailability = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const update: BulkAvailabilityUpdate = {
                roomId: req.body.roomId,
                startDate: req.body.startDate,
                endDate: req.body.endDate,
                availableCount: req.body.availableCount,
                price: req.body.price,
                minimumStay: req.body.minimumStay,
                isBlocked: req.body.isBlocked,
                daysOfWeek: req.body.daysOfWeek
            };

            if (!update.roomId || !update.startDate || !update.endDate) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'roomId, startDate, and endDate are required');
                return;
            }

            const startDate = new Date(update.startDate);
            const endDate = new Date(update.endDate);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            if (startDate >= endDate) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'End date must be after start date');
                return;
            }

            const results = await this.calendarService.bulkUpdateAvailability(update, ownerId);

            successResponse(res, { updates: results }, 'Bulk availability updated successfully');
        } catch (error) {
            logger.error('Error bulk updating availability:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ValidationError') {
                errorResponse(res, 400, 'VALIDATION_ERROR', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to bulk update availability');
            }
        }
    };

    /**
     * Block dates for a room
     */
    blockDates = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const { roomId, startDate, endDate, reason } = req.body;

            if (!roomId || !startDate || !endDate) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'roomId, startDate, and endDate are required');
                return;
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            await this.calendarService.blockDates(roomId, start, end, ownerId, reason);

            successResponse(res, null, 'Dates blocked successfully');
        } catch (error) {
            logger.error('Error blocking dates:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ConflictError') {
                errorResponse(res, 409, 'CONFLICT', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to block dates');
            }
        }
    };

    /**
     * Unblock dates for a room
     */
    unblockDates = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const { roomId, startDate, endDate } = req.body;

            if (!roomId || !startDate || !endDate) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'roomId, startDate, and endDate are required');
                return;
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            await this.calendarService.unblockDates(roomId, start, end, ownerId);

            successResponse(res, null, 'Dates unblocked successfully');
        } catch (error) {
            logger.error('Error unblocking dates:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to unblock dates');
            }
        }
    };

    /**
     * Get occupancy report for a property
     */
    getOccupancyReport = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const propertyId = req.params.propertyId;
            const startDate = new Date(req.query.startDate as string);
            const endDate = new Date(req.query.endDate as string);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            const report = await this.calendarService.getOccupancyReport(propertyId, startDate, endDate, ownerId);

            successResponse(res, report, 'Occupancy report retrieved successfully');
        } catch (error) {
            logger.error('Error getting occupancy report:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get occupancy report');
            }
        }
    };
}