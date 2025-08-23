import { describe, test, expect, beforeEach } from '@jest/globals';
import { AutocompleteService } from '../../services/autocomplete-service';
import { SearchService } from '../../services/search-service';
import { getTestElasticsearchClient, getTestRedisClient, createTestDocuments, waitForElasticsearchRefresh } from '../setup';
import { AutocompleteQuery } from '../../types/search-types';

describe('AutocompleteService', () => {
    let autocompleteService: AutocompleteService;
    let searchService: SearchService;
    let testDocuments: any[];

    beforeEach(async () => {
        const esClient = getTestElasticsearchClient();
        const redisClient = getTestRedisClient();

        autocompleteService = new AutocompleteService(esClient, redisClient);
        searchService = new SearchService(esClient, redisClient);
        testDocuments = createTestDocuments();

        // Initialize indices and index test data
        await searchService.initializeIndices();

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

        await waitForElasticsearchRefresh();
    });

    describe('getSuggestions', () => {
        test('should get autocomplete suggestions for valid query', async () => {
            const query: AutocompleteQuery = {
                query: 'Mac',
                limit: 5
            };

            const result = await autocompleteService.getSuggestions(query);

            expect(result.suggestions).toBeDefined();
            expect(Array.isArray(result.suggestions)).toBe(true);
            expect(result.took).toBeGreaterThan(0);
        });

        test('should filter suggestions by type', async () => {
            const query: AutocompleteQuery = {
                query: 'hotel',
                type: 'hotel',
                limit: 5
            };

            const result = await autocompleteService.getSuggestions(query);

            expect(result.suggestions).toBeDefined();
            expect(Array.isArray(result.suggestions)).toBe(true);
        });

        test('should reject queries that are too short', async () => {
            const query: AutocompleteQuery = {
                query: 'a',
                limit: 5
            };

            await expect(autocompleteService.getSuggestions(query)).rejects.toThrow('Query too short for autocomplete');
        });

        test('should limit suggestions to specified count', async () => {
            const query: AutocompleteQuery = {
                query: 'pro',
                limit: 3
            };

            const result = await autocompleteService.getSuggestions(query);

            expect(result.suggestions.length).toBeLessThanOrEqual(3);
        });

        test('should return suggestions with proper structure', async () => {
            const query: AutocompleteQuery = {
                query: 'Mac',
                limit: 5
            };

            const result = await autocompleteService.getSuggestions(query);

            if (result.suggestions.length > 0) {
                const suggestion = result.suggestions[0];
                expect(suggestion).toHaveProperty('text');
                expect(suggestion).toHaveProperty('type');
                expect(suggestion).toHaveProperty('score');
                expect(typeof suggestion.text).toBe('string');
                expect(typeof suggestion.type).toBe('string');
                expect(typeof suggestion.score).toBe('number');
            }
        });
    });

    describe('getPopularSearchTerms', () => {
        test('should return popular search terms', async () => {
            const terms = await autocompleteService.getPopularSearchTerms();

            expect(Array.isArray(terms)).toBe(true);
            expect(terms.length).toBeGreaterThan(0);
            expect(terms.every(term => typeof term === 'string')).toBe(true);
        });

        test('should filter popular terms by type', async () => {
            const terms = await autocompleteService.getPopularSearchTerms('product', 5);

            expect(Array.isArray(terms)).toBe(true);
            expect(terms.length).toBeLessThanOrEqual(5);
        });

        test('should respect limit parameter', async () => {
            const limit = 3;
            const terms = await autocompleteService.getPopularSearchTerms(undefined, limit);

            expect(terms.length).toBeLessThanOrEqual(limit);
        });
    });

    describe('recordSearchQuery', () => {
        test('should record search query without errors', async () => {
            await expect(
                autocompleteService.recordSearchQuery('test query', 'product', 'user-123')
            ).resolves.not.toThrow();
        });

        test('should handle missing optional parameters', async () => {
            await expect(
                autocompleteService.recordSearchQuery('test query')
            ).resolves.not.toThrow();
        });
    });
});