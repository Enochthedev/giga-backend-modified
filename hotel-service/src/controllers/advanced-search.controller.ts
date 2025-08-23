import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AdvancedSearchService, AdvancedSearchFilters } from '../services/advanced-search.service';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class AdvancedSearchController {
    private searchService: AdvancedSearchService;

    constructor() {
        this.searchService = new AdvancedSearchService();
    }

    /**
     * Advanced property search with filters and facets
     */
    searchProperties = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const filters: AdvancedSearchFilters = {
                // Basic filters
                city: req.query.city as string,
                country: req.query.country as string,
                checkInDate: req.query.checkInDate as string,
                checkOutDate: req.query.checkOutDate as string,
                adults: req.query.adults ? parseInt(req.query.adults as string) : undefined,
                children: req.query.children ? parseInt(req.query.children as string) : undefined,

                // Location filters
                latitude: req.query.latitude ? parseFloat(req.query.latitude as string) : undefined,
                longitude: req.query.longitude ? parseFloat(req.query.longitude as string) : undefined,
                radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,

                // Property filters
                propertyTypes: req.query.propertyTypes ? (req.query.propertyTypes as string).split(',') : undefined,
                minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
                maxRating: req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined,
                reviewCount: req.query.reviewCount ? parseInt(req.query.reviewCount as string) : undefined,

                // Price filters
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,

                // Amenity filters
                requiredAmenities: req.query.requiredAmenities ? (req.query.requiredAmenities as string).split(',') : undefined,
                excludedAmenities: req.query.excludedAmenities ? (req.query.excludedAmenities as string).split(',') : undefined,

                // Room filters
                roomTypes: req.query.roomTypes ? (req.query.roomTypes as string).split(',') : undefined,
                minRoomSize: req.query.minRoomSize ? parseFloat(req.query.minRoomSize as string) : undefined,
                maxRoomSize: req.query.maxRoomSize ? parseFloat(req.query.maxRoomSize as string) : undefined,
                bedTypes: req.query.bedTypes ? (req.query.bedTypes as string).split(',') : undefined,

                // Booking filters
                instantBook: req.query.instantBook === 'true',
                freeCancellation: req.query.freeCancellation === 'true',

                // Sorting and pagination
                sortBy: req.query.sortBy as any,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20
            };

            const result = await this.searchService.searchProperties(filters);

            // Log search for analytics
            if (req.query.city || req.query.latitude) {
                // This would typically be logged to analytics service
                logger.info('Property search performed', {
                    filters: {
                        city: filters.city,
                        location: filters.latitude ? { lat: filters.latitude, lng: filters.longitude } : null,
                        dates: filters.checkInDate ? { checkIn: filters.checkInDate, checkOut: filters.checkOutDate } : null
                    },
                    resultCount: result.total,
                    userId: req.user?.id
                });
            }

            successResponse(res, result, 'Properties retrieved successfully');
        } catch (error) {
            logger.error('Error searching properties:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to search properties');
        }
    };

    /**
     * Get search suggestions for autocomplete
     */
    getSearchSuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const query = req.query.q as string;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            if (!query || query.trim().length < 2) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Query must be at least 2 characters long');
                return;
            }

            const suggestions = await this.searchService.getSearchSuggestions(query.trim(), limit);

            successResponse(res, { suggestions }, 'Search suggestions retrieved successfully');
        } catch (error) {
            logger.error('Error getting search suggestions:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get search suggestions');
        }
    };

    /**
     * Get popular destinations
     */
    getPopularDestinations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            const destinations = await this.searchService.getPopularDestinations(limit);

            successResponse(res, { destinations }, 'Popular destinations retrieved successfully');
        } catch (error) {
            logger.error('Error getting popular destinations:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get popular destinations');
        }
    };
}