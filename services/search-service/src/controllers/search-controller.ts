import { Request, Response } from 'express';
import { SearchService } from '../services/search-service';
import { AutocompleteService } from '../services/autocomplete-service';
import { RecommendationService } from '../services/recommendation-service';
import { ResponseHelper } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
    SearchQuery,
    AutocompleteQuery,
    RecommendationQuery,
    IndexingRequest,
    UserInteraction
} from '../types/search-types';

export class SearchController {
    constructor(
        private searchService: SearchService,
        private autocompleteService: AutocompleteService,
        private recommendationService: RecommendationService
    ) { }

    /**
     * Search documents with filters and facets
     * @route POST /api/search
     */
    search = async (req: Request, res: Response): Promise<Response> => {
        try {
            const query: SearchQuery = {
                query: req.body.query,
                filters: req.body.filters,
                sort: req.body.sort,
                pagination: {
                    page: parseInt(req.body.page) || 1,
                    size: Math.min(parseInt(req.body.size) || 20, 100) // Max 100 results per page
                },
                facets: req.body.facets
            };

            // Validate pagination
            if (query.pagination!.page < 1) {
                throw new ValidationError('Page number must be greater than 0');
            }

            const result = await this.searchService.search(query);

            return ResponseHelper.success(res, result, 'Search completed successfully', 200, {
                took: result.took
            });
        } catch (error) {
            logger.error('Search error:', error);

            if (error instanceof ValidationError) {
                return ResponseHelper.validationError(res, error.message);
            }

            return ResponseHelper.error(res, 'Search operation failed', 500);
        }
    };

    /**
     * Get autocomplete suggestions
     * @route GET /api/search/autocomplete
     */
    autocomplete = async (req: Request, res: Response): Promise<Response> => {
        try {
            const query: AutocompleteQuery = {
                query: req.query.q as string,
                type: req.query.type as string,
                limit: Math.min(parseInt(req.query.limit as string) || 10, 20) // Max 20 suggestions
            };

            if (!query.query) {
                throw new ValidationError('Query parameter is required');
            }

            if (query.query.length < 2) {
                throw new ValidationError('Query must be at least 2 characters long');
            }

            const result = await this.autocompleteService.getSuggestions(query);

            // Record the search query for analytics
            await this.autocompleteService.recordSearchQuery(
                query.query,
                query.type,
                req.headers['user-id'] as string
            );

            return ResponseHelper.success(res, result, 'Autocomplete suggestions retrieved', 200, {
                took: result.took
            });
        } catch (error) {
            logger.error('Autocomplete error:', error);

            if (error instanceof ValidationError) {
                return ResponseHelper.validationError(res, error.message);
            }

            return ResponseHelper.error(res, 'Autocomplete operation failed', 500);
        }
    };

    /**
     * Get popular search terms
     * @route GET /api/search/popular-terms
     */
    getPopularTerms = async (req: Request, res: Response): Promise<Response> => {
        try {
            const type = req.query.type as string;
            const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

            const terms = await this.autocompleteService.getPopularSearchTerms(type, limit);

            return ResponseHelper.success(res, { terms }, 'Popular search terms retrieved');
        } catch (error) {
            logger.error('Popular terms error:', error);
            return ResponseHelper.error(res, 'Failed to get popular search terms', 500);
        }
    };

    /**
     * Get recommendations for a user or item
     * @route POST /api/search/recommendations
     */
    getRecommendations = async (req: Request, res: Response): Promise<Response> => {
        try {
            const query: RecommendationQuery = {
                userId: req.body.userId || req.headers['user-id'] as string,
                itemId: req.body.itemId,
                type: req.body.type,
                limit: Math.min(parseInt(req.body.limit) || 10, 50), // Max 50 recommendations
                algorithm: req.body.algorithm
            };

            if (!query.userId && !query.itemId) {
                throw new ValidationError('Either userId or itemId is required');
            }

            const result = await this.recommendationService.getRecommendations(query);

            return ResponseHelper.success(res, result, 'Recommendations retrieved successfully', 200, {
                took: result.took
            });
        } catch (error) {
            logger.error('Recommendations error:', error);

            if (error instanceof ValidationError) {
                return ResponseHelper.validationError(res, error.message);
            }

            return ResponseHelper.error(res, 'Recommendations operation failed', 500);
        }
    };

    /**
     * Record user interaction for recommendations
     * @route POST /api/search/interactions
     */
    recordInteraction = async (req: Request, res: Response): Promise<Response> => {
        try {
            const interaction: UserInteraction = {
                userId: req.body.userId || req.headers['user-id'] as string,
                itemId: req.body.itemId,
                itemType: req.body.itemType,
                interactionType: req.body.interactionType,
                timestamp: new Date(req.body.timestamp || Date.now()),
                metadata: req.body.metadata
            };

            // Validate required fields
            if (!interaction.userId) {
                throw new ValidationError('User ID is required');
            }
            if (!interaction.itemId) {
                throw new ValidationError('Item ID is required');
            }
            if (!interaction.itemType) {
                throw new ValidationError('Item type is required');
            }
            if (!interaction.interactionType) {
                throw new ValidationError('Interaction type is required');
            }

            // Validate interaction type
            const validInteractionTypes = ['view', 'click', 'purchase', 'like', 'share'];
            if (!validInteractionTypes.includes(interaction.interactionType)) {
                throw new ValidationError(`Invalid interaction type. Must be one of: ${validInteractionTypes.join(', ')}`);
            }

            await this.recommendationService.recordInteraction(interaction);

            return ResponseHelper.success(res, null, 'Interaction recorded successfully', 201);
        } catch (error) {
            logger.error('Record interaction error:', error);

            if (error instanceof ValidationError) {
                return ResponseHelper.validationError(res, error.message);
            }

            return ResponseHelper.error(res, 'Failed to record interaction', 500);
        }
    };

    /**
     * Index documents (admin endpoint)
     * @route POST /api/search/index
     */
    indexDocuments = async (req: Request, res: Response): Promise<Response> => {
        try {
            const request: IndexingRequest = {
                documents: req.body.documents,
                index: req.body.index,
                operation: req.body.operation || 'index'
            };

            // Validate request
            if (!request.documents || !Array.isArray(request.documents)) {
                throw new ValidationError('Documents array is required');
            }
            if (!request.index) {
                throw new ValidationError('Index name is required');
            }

            // Validate operation
            const validOperations = ['index', 'update', 'delete'];
            if (!validOperations.includes(request.operation)) {
                throw new ValidationError(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
            }

            // Validate documents
            if (request.documents.length === 0) {
                throw new ValidationError('At least one document is required');
            }

            // Limit batch size
            if (request.documents.length > 1000) {
                throw new ValidationError('Maximum 1000 documents per batch');
            }

            const result = await this.searchService.indexDocuments(request);

            return ResponseHelper.success(res, result, 'Documents indexed successfully', 200, {
                took: result.took
            });
        } catch (error) {
            logger.error('Index documents error:', error);

            if (error instanceof ValidationError) {
                return ResponseHelper.validationError(res, error.message);
            }

            return ResponseHelper.error(res, 'Indexing operation failed', 500);
        }
    };

    /**
     * Health check endpoint
     * @route GET /api/search/health
     */
    healthCheck = async (req: Request, res: Response): Promise<Response> => {
        try {
            // This would typically check Elasticsearch and Redis connectivity
            return ResponseHelper.success(res, {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'search-service'
            }, 'Service is healthy');
        } catch (error) {
            logger.error('Health check error:', error);
            return ResponseHelper.error(res, 'Service is unhealthy', 503);
        }
    };
}