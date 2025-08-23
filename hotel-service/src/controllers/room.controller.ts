import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/room.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { successResponse } from '../utils/response';

export class RoomController {
    private roomService: RoomService;

    constructor() {
        this.roomService = new RoomService();
    }

    createRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { propertyId } = req.params;
            const room = await this.roomService.createRoom(propertyId, req.user!.id, req.body);
            successResponse(res, room, 'Room created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getRoom = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const room = await this.roomService.getRoomById(id);
            successResponse(res, room, 'Room retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getPropertyRooms = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { propertyId } = req.params;
            const rooms = await this.roomService.getRoomsByProperty(propertyId);
            successResponse(res, rooms, 'Property rooms retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const room = await this.roomService.updateRoom(id, req.user!.id, req.body);
            successResponse(res, room, 'Room updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await this.roomService.deleteRoom(id, req.user!.id);
            successResponse(res, null, 'Room deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    checkRoomAvailability = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { checkInDate, checkOutDate } = req.query;

            const isAvailable = await this.roomService.checkRoomAvailability(
                id,
                new Date(checkInDate as string),
                new Date(checkOutDate as string)
            );

            successResponse(res, { available: isAvailable }, 'Room availability checked successfully');
        } catch (error) {
            next(error);
        }
    };
}