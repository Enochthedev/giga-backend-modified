import { Request, Response, NextFunction } from 'express';
import { PropertyService } from '../services/property.service';
import { RoomService } from '../services/room.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { successResponse } from '../utils/response';
import { PropertySearchFilters } from '../types/hotel.types';

export class PropertyController {
    private propertyService: PropertyService;
    private roomService: RoomService;

    constructor() {
        this.propertyService = new PropertyService();
        this.roomService = new RoomService();
    }

    createProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const property = await this.propertyService.createProperty(req.user!.id, req.body);
            successResponse(res, property, 'Property created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getProperty = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const property = await this.propertyService.getPropertyById(id);
            const rooms = await this.roomService.getRoomsByProperty(id);

            successResponse(res, { ...property, rooms }, 'Property retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const property = await this.propertyService.updateProperty(id, req.user!.id, req.body);
            successResponse(res, property, 'Property updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            await this.propertyService.deleteProperty(id, req.user!.id);
            successResponse(res, null, 'Property deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    searchProperties = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const filters: PropertySearchFilters = {
                ...req.query,
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                adults: req.query.adults ? parseInt(req.query.adults as string) : undefined,
                children: req.query.children ? parseInt(req.query.children as string) : undefined,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
                rating: req.query.rating ? parseFloat(req.query.rating as string) : undefined,
                latitude: req.query.latitude ? parseFloat(req.query.latitude as string) : undefined,
                longitude: req.query.longitude ? parseFloat(req.query.longitude as string) : undefined,
                radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
                amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined
            };

            const result = await this.propertyService.searchProperties(filters);

            successResponse(
                res,
                result.properties,
                'Properties retrieved successfully',
                200,
                {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / result.limit)
                }
            );
        } catch (error) {
            next(error);
        }
    };

    getOwnerProperties = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const properties = await this.propertyService.getPropertiesByOwner(req.user!.id);
            successResponse(res, properties, 'Owner properties retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { checkInDate, checkOutDate, adults, children } = req.query;

            const availableRooms = await this.roomService.getAvailableRooms(
                id,
                new Date(checkInDate as string),
                new Date(checkOutDate as string),
                parseInt(adults as string),
                children ? parseInt(children as string) : 0
            );

            successResponse(res, availableRooms, 'Room availability retrieved successfully');
        } catch (error) {
            next(error);
        }
    };
}