import { Client } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '../config/elasticsearch-config';
import { RedisClient } from '../config/redis-config';
import {
    SearchDocument,
    SearchQuery,
    SearchResult,
    SearchFilters,
    SearchFacets,
    FacetBucket,
    IndexingRequest,
    IndexingResult
} from '../types/search-types';
import { ElasticsearchError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class SearchService {
    private esClient: Client;
    private redisClient: RedisClient;
    private esConfig: ElasticsearchClient;

    constructor(esConfig: ElasticsearchClient, redisClient: RedisClient) {
        this.esConfig = esConfig;
        this.esClient = esConfig.getClient();
        this.redisClient = redisClient;
    }

    /**
     * Initialize search indices with proper mappings
     */
    async initializeIndices(): Promise<void> {
        try {
            // Product index mapping
            const productMapping = {
                properties: {
                    id: { type: 'keyword' },
                    type: { type: 'keyword' },
                    title: {
                        type: 'text',
                        analyzer: 'autocomplete_analyzer',
                        search_analyzer: 'search_analyzer',
                        fields: {
                            keyword: { type: 'keyword' },
                            suggest: { type: 'completion' }
                        }
                    },
                    description: {
                        type: 'text',
                        analyzer: 'standard'
                    },
                    category: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    price: { type: 'float' },
                    currency: { type: 'keyword' },
                    location: { type: 'geo_point' },
                    rating: { type: 'float' },
                    reviewCount: { type: 'integer' },
                    availability: { type: 'boolean' },
                    vendorId: { type: 'keyword' },
                    vendorName: { type: 'keyword' },
                    brand: { type: 'keyword' },
                    sku: { type: 'keyword' },
                    inStock: { type: 'boolean' },
                    stockQuantity: { type: 'integer' },
                    attributes: { type: 'object' },
                    createdAt: { type: 'date' },
                    updatedAt: { type: 'date' }
                }
            };

            // Hotel index mapping
            const hotelMapping = {
                properties: {
                    id: { type: 'keyword' },
                    type: { type: 'keyword' },
                    title: {
                        type: 'text',
                        analyzer: 'autocomplete_analyzer',
                        search_analyzer: 'search_analyzer',
                        fields: {
                            keyword: { type: 'keyword' },
                            suggest: { type: 'completion' }
                        }
                    },
                    description: { type: 'text' },
                    category: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    price: { type: 'float' },
                    currency: { type: 'keyword' },
                    location: { type: 'geo_point' },
                    rating: { type: 'float' },
                    reviewCount: { type: 'integer' },
                    availability: { type: 'boolean' },
                    propertyId: { type: 'keyword' },
                    propertyType: { type: 'keyword' },
                    amenities: { type: 'keyword' },
                    checkInTime: { type: 'keyword' },
                    checkOutTime: { type: 'keyword' },
                    maxGuests: { type: 'integer' },
                    roomCount: { type: 'integer' },
                    createdAt: { type: 'date' },
                    updatedAt: { type: 'date' }
                }
            };

            await this.esConfig.createIndexIfNotExists('products', productMapping);
            await this.esConfig.createIndexIfNotExists('hotels', hotelMapping);

            logger.info('Search indices initialized successfully');
        } catch (error) {
            logger.error('Error initializing search indices:', error);
            throw new ElasticsearchError('Failed to initialize search indices', error);
        }
    }

    /**
     * Index documents in Elasticsearch
     */
    async indexDocuments(request: IndexingRequest): Promise<IndexingResult> {
        const startTime = Date.now();

        try {
            if (!request.documents || request.documents.length === 0) {
                throw new ValidationError('No documents provided for indexing');
            }

            const indexName = this.esConfig.getIndexName(request.index);
            const body: any[] = [];
            const errors: any[] = [];

            // Prepare bulk operations
            for (const doc of request.documents) {
                const operation = {
                    [request.operation]: {
                        _index: indexName,
                        _id: doc.id
                    }
                };

                body.push(operation);

                if (request.operation !== 'delete') {
                    body.push(doc);
                }
            }

            // Execute bulk operation
            const response = await this.esClient.bulk({ body });

            // Process results
            let indexed = 0;
            if (response.items) {
                response.items.forEach((item: any, index: number) => {
                    const operation = Object.keys(item)[0];
                    const result = item[operation];

                    if (result.error) {
                        errors.push({
                            documentId: request.documents[index]?.id || 'unknown',
                            error: result.error.reason || 'Unknown error',
                            status: result.status || 500
                        });
                    } else {
                        indexed++;
                    }
                });
            }

            // Clear cache for affected indices
            await this.clearSearchCache(request.index);

            const took = Date.now() - startTime;
            logger.info(`Indexed ${indexed} documents in ${took}ms`);

            return {
                success: errors.length === 0,
                indexed,
                errors,
                took
            };
        } catch (error) {
            logger.error('Error indexing documents:', error);
            throw new ElasticsearchError('Failed to index documents', error);
        }
    }

    /**
     * Search documents with filters and facets
     */
    async search(query: SearchQuery): Promise<SearchResult> {
        const startTime = Date.now();

        try {
            // Check cache first
            const cacheKey = this.generateCacheKey('search', query);
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const searchBody = this.buildSearchQuery(query);
            const indices = this.getSearchIndices(query.filters?.type);

            const response = await this.esClient.search({
                index: indices,
                body: searchBody
            });

            const result = this.processSearchResponse(response, query);
            result.took = Date.now() - startTime;

            // Cache the result
            await this.setCache(cacheKey, JSON.stringify(result), 300); // 5 minutes

            return result;
        } catch (error) {
            logger.error('Error performing search:', error);
            throw new ElasticsearchError('Search operation failed', error);
        }
    }

    /**
     * Build Elasticsearch query from search parameters
     */
    private buildSearchQuery(query: SearchQuery): any {
        const searchBody: any = {
            query: {
                bool: {
                    must: [],
                    filter: []
                }
            },
            aggs: {},
            from: ((query.pagination?.page || 1) - 1) * (query.pagination?.size || 20),
            size: query.pagination?.size || 20
        };

        // Text search
        if (query.query) {
            searchBody.query.bool.must.push({
                multi_match: {
                    query: query.query,
                    fields: ['title^3', 'description^2', 'tags', 'category'],
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                }
            });
        } else {
            searchBody.query.bool.must.push({ match_all: {} });
        }

        // Apply filters
        if (query.filters) {
            this.applyFilters(searchBody.query.bool.filter, query.filters);
        }

        // Apply sorting
        if (query.sort) {
            searchBody.sort = [{
                [query.sort.field]: { order: query.sort.order }
            }];
        } else {
            // Default sorting by relevance and rating
            searchBody.sort = [
                '_score',
                { rating: { order: 'desc' } },
                { createdAt: { order: 'desc' } }
            ];
        }

        // Add facets/aggregations
        if (query.facets) {
            this.addFacets(searchBody.aggs, query.facets);
        }

        return searchBody;
    }

    /**
     * Apply filters to the search query
     */
    private applyFilters(filterArray: any[], filters: SearchFilters): void {
        // Type filter
        if (filters.type && filters.type.length > 0) {
            filterArray.push({
                terms: { type: filters.type }
            });
        }

        // Category filter
        if (filters.category && filters.category.length > 0) {
            filterArray.push({
                terms: { category: filters.category }
            });
        }

        // Price range filter
        if (filters.priceRange) {
            const priceFilter: any = { range: { price: {} } };
            if (filters.priceRange.min !== undefined) {
                priceFilter.range.price.gte = filters.priceRange.min;
            }
            if (filters.priceRange.max !== undefined) {
                priceFilter.range.price.lte = filters.priceRange.max;
            }
            filterArray.push(priceFilter);
        }

        // Location filter
        if (filters.location) {
            filterArray.push({
                geo_distance: {
                    distance: filters.location.radius,
                    location: {
                        lat: filters.location.center.lat,
                        lon: filters.location.center.lon
                    }
                }
            });
        }

        // Rating filter
        if (filters.rating) {
            const ratingFilter: any = { range: { rating: {} } };
            if (filters.rating.min !== undefined) {
                ratingFilter.range.rating.gte = filters.rating.min;
            }
            if (filters.rating.max !== undefined) {
                ratingFilter.range.rating.lte = filters.rating.max;
            }
            filterArray.push(ratingFilter);
        }

        // Availability filter
        if (filters.availability !== undefined) {
            filterArray.push({
                term: { availability: filters.availability }
            });
        }

        // Tags filter
        if (filters.tags && filters.tags.length > 0) {
            filterArray.push({
                terms: { tags: filters.tags }
            });
        }

        // Attributes filter
        if (filters.attributes) {
            Object.entries(filters.attributes).forEach(([key, value]) => {
                filterArray.push({
                    term: { [`attributes.${key}`]: value }
                });
            });
        }
    }

    /**
     * Add facets/aggregations to the search query
     */
    private addFacets(aggs: any, facets: string[]): void {
        facets.forEach(facet => {
            switch (facet) {
                case 'category':
                    aggs.categories = {
                        terms: { field: 'category', size: 20 }
                    };
                    break;
                case 'type':
                    aggs.types = {
                        terms: { field: 'type', size: 10 }
                    };
                    break;
                case 'price':
                    aggs.price_ranges = {
                        range: {
                            field: 'price',
                            ranges: [
                                { to: 50 },
                                { from: 50, to: 100 },
                                { from: 100, to: 200 },
                                { from: 200, to: 500 },
                                { from: 500 }
                            ]
                        }
                    };
                    break;
                case 'rating':
                    aggs.ratings = {
                        range: {
                            field: 'rating',
                            ranges: [
                                { from: 4.5 },
                                { from: 4.0, to: 4.5 },
                                { from: 3.5, to: 4.0 },
                                { from: 3.0, to: 3.5 },
                                { to: 3.0 }
                            ]
                        }
                    };
                    break;
                case 'tags':
                    aggs.tags = {
                        terms: { field: 'tags', size: 30 }
                    };
                    break;
            }
        });
    }

    /**
     * Process Elasticsearch response into SearchResult
     */
    private processSearchResponse(response: any, query: SearchQuery): SearchResult {
        const hits = response.hits;
        const documents = hits.hits.map((hit: any) => ({
            ...hit._source,
            _score: hit._score
        }));

        const result: SearchResult = {
            documents,
            total: hits.total.value,
            page: query.pagination?.page || 1,
            size: query.pagination?.size || 20,
            totalPages: Math.ceil(hits.total.value / (query.pagination?.size || 20)),
            took: 0 // Will be set by caller
        };

        // Process facets
        if (response.aggregations) {
            result.facets = this.processFacets(response.aggregations);
        }

        return result;
    }

    /**
     * Process Elasticsearch aggregations into facets
     */
    private processFacets(aggregations: any): SearchFacets {
        const facets: SearchFacets = {};

        Object.entries(aggregations).forEach(([key, agg]: [string, any]) => {
            if (agg.buckets) {
                facets[key] = agg.buckets.map((bucket: any) => ({
                    key: bucket.key,
                    count: bucket.doc_count
                }));
            }
        });

        return facets;
    }

    /**
     * Get search indices based on type filter
     */
    private getSearchIndices(types?: string[]): string {
        if (!types || types.length === 0) {
            return this.esConfig.getIndexName('*');
        }

        const indices = types.map(type => {
            switch (type) {
                case 'product':
                    return this.esConfig.getIndexName('products');
                case 'hotel':
                    return this.esConfig.getIndexName('hotels');
                default:
                    return this.esConfig.getIndexName('*');
            }
        });

        return indices.join(',');
    }

    /**
     * Generate cache key for search queries
     */
    private generateCacheKey(prefix: string, data: any): string {
        const hash = require('crypto')
            .createHash('md5')
            .update(JSON.stringify(data))
            .digest('hex');
        return `${prefix}:${hash}`;
    }

    /**
     * Get data from cache
     */
    private async getFromCache(key: string): Promise<string | null> {
        try {
            return await this.redisClient.get(key);
        } catch (error) {
            logger.warn('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set data in cache
     */
    private async setCache(key: string, value: string, ttl: number): Promise<void> {
        try {
            await this.redisClient.set(key, value, ttl);
        } catch (error) {
            logger.warn('Cache set error:', error);
        }
    }

    /**
     * Clear search cache for specific index
     */
    private async clearSearchCache(index: string): Promise<void> {
        try {
            // In a real implementation, you might want to use Redis patterns
            // to clear all search-related cache keys for the index
            logger.info(`Clearing cache for index: ${index}`);
        } catch (error) {
            logger.warn('Cache clear error:', error);
        }
    }
}