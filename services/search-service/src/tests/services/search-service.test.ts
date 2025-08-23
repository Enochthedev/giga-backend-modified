import { describe, test, expect, beforeEach } from '@jest/globals';
import { SearchService } from '../../services/search-service';
import { getTestElasticsearchClient, getTestRedisClient, createTestDocuments, waitForElasticsearchRefresh } from '../setup';
import { SearchQuery, IndexingRequest } from '../../types/search-types';

describe('SearchService', () => {
    let searchService: SearchService;
    let testDocuments: any[];

    beforeEach(async () => {
        const esClient = getTestElasticsearchClient();
        const redisClient = getTestRedisClient();

        searchService = new SearchService(esClient, redisClient);
        testDocuments = createTestDocuments();

        // Initialize indices
        await searchService.initializeIndices();
    });

    describe('indexDocuments', () => {
        test('should index documents successfully', async () => {
            const request: IndexingRequest = {
                documents: testDocuments.filter(doc => doc.type === 'product'),
                index: 'products',
                operation: 'index'
            };

            const result = await searchService.indexDocuments(request);

            expect(result.success).toBe(true);
            expect(result.indexed).toBe(2);
            expect(result.errors).toHaveLength(0);
            expect(result.took).toBeGreaterThan(0);
        });

        test('should handle empty documents array', async () => {
            const request: IndexingRequest = {
                documents: [],
                index: 'products',
                operation: 'index'
            };

            await expect(searchService.indexDocuments(request)).rejects.toThrow('No documents provided for indexing');
        });
    });

    describe('search', () => {
        beforeEach(async () => {
            // Index test documents
            await searchService.indexDocuments({
                documents: testDocuments.filter(doc => doc.type === 'product'),
                index: 'products',
                operation: 'index'
            });

            await searchService.indexDocuments({
                documents: testDocuments.filter(doc => doc.type === 'hotel'),
                index: 'hotels',
                operation: 'index'
            });

            // Wait for Elasticsearch to refresh
            await waitForElasticsearchRefresh();
        });

        test('should perform basic text search', async () => {
            const query: SearchQuery = {
                query: 'MacBook',
                pagination: { page: 1, size: 10 }
            };

            const result = await searchService.search(query);

            expect(result.documents).toHaveLength(1);
            expect(result.documents[0].title).toContain('MacBook');
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
            expect(result.size).toBe(10);
        });

        test('should search with type filter', async () => {
            const query: SearchQuery = {
                filters: {
                    type: ['product']
                },
                pagination: { page: 1, size: 10 }
            };

            const result = await searchService.search(query);

            expect(result.documents).toHaveLength(2);
            expect(result.documents.every(doc => doc.type === 'product')).toBe(true);
        });

        test('should search with price range filter', async () => {
            const query: SearchQuery = {
                filters: {
                    priceRange: {
                        min: 300,
                        max: 500
                    }
                },
                pagination: { page: 1, size: 10 }
            };

            const result = await searchService.search(query);

            expect(result.documents.length).toBeGreaterThan(0);
            expect(result.documents.every(doc => doc.price >= 300 && doc.price <= 500)).toBe(true);
        });

        test('should search with category filter', async () => {
            const query: SearchQuery = {
                filters: {
                    category: ['Electronics']
                },
                pagination: { page: 1, size: 10 }
            };

            const result = await searchService.search(query);

            expect(result.documents.length).toBeGreaterThan(0);
            expect(result.documents.every(doc => doc.category === 'Electronics')).toBe(true);
        });

        test('should return facets when requested', async () => {
            const query: SearchQuery = {
                facets: ['category', 'type'],
                pagination: { page: 1, size: 10 }
            };

            const result = await searchService.search(query);

            expect(result.facets).toBeDefined();
            expect(result.facets?.categories).toBeDefined();
            expect(result.facets?.types).toBeDefined();
        });

        test('should handle sorting', async () => {
            const query: SearchQuery = {
                sort: {
                    field: 'price',
                    order: 'asc'
                },
                pagination: { page: 1, size: 10 }
            };

            const result = await searchService.search(query);

            expect(result.documents.length).toBeGreaterThan(1);

            // Check if results are sorted by price ascending
            for (let i = 1; i < result.documents.length; i++) {
                expect(result.documents[i].price).toBeGreaterThanOrEqual(result.documents[i - 1].price);
            }
        });

        test('should handle pagination', async () => {
            const query: SearchQuery = {
                pagination: { page: 1, size: 1 }
            };

            const result = await searchService.search(query);

            expect(result.documents).toHaveLength(1);
            expect(result.page).toBe(1);
            expect(result.size).toBe(1);
            expect(result.totalPages).toBeGreaterThan(1);
        });

        test('should return empty results for non-matching query', async () => {
            const query: SearchQuery = {
                query: 'nonexistentproduct12345',
                pagination: { page: 1, size: 10 }
            };

            const result = await searchService.search(query);

            expect(result.documents).toHaveLength(0);
            expect(result.total).toBe(0);
        });
    });
});