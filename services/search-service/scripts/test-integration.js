#!/usr/bin/env node

/**
 * Integration test script for the search service
 * This script tests the main functionality of the search service
 */

const axios = require('axios');

const BASE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3007';

// Test data
const testDocuments = [
    {
        id: 'product-test-1',
        type: 'product',
        title: 'iPhone 15 Pro',
        description: 'Latest iPhone with advanced camera system',
        category: 'Electronics',
        tags: ['smartphone', 'apple', 'camera'],
        price: 999.99,
        currency: 'USD',
        rating: 4.7,
        reviewCount: 500,
        availability: true,
        vendorId: 'apple-store',
        vendorName: 'Apple Store',
        brand: 'Apple',
        sku: 'IP15P-128-TB',
        inStock: true,
        stockQuantity: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'hotel-test-1',
        type: 'hotel',
        title: 'Seaside Resort & Spa',
        description: 'Luxury beachfront resort with world-class amenities',
        category: 'Accommodation',
        tags: ['luxury', 'beachfront', 'spa', 'resort'],
        price: 450.00,
        currency: 'USD',
        location: {
            lat: 25.7617,
            lon: -80.1918,
            city: 'Miami',
            country: 'USA'
        },
        rating: 4.8,
        reviewCount: 1200,
        availability: true,
        propertyId: 'seaside-resort-1',
        propertyType: 'hotel',
        amenities: ['wifi', 'pool', 'spa', 'restaurant', 'beach-access'],
        checkInTime: '16:00',
        checkOutTime: '11:00',
        maxGuests: 6,
        roomCount: 200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

class SearchServiceTester {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.axios = axios.create({
            baseURL: baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'user-id': 'test-user-123',
                'user-role': 'admin',
                'Authorization': 'Bearer test-token-12345'
            }
        });
    }

    async runTests() {
        console.log('🚀 Starting Search Service Integration Tests');
        console.log(`📍 Base URL: ${this.baseUrl}`);
        console.log('');

        try {
            await this.testHealthCheck();
            await this.testIndexing();
            await this.testSearch();
            await this.testAutocomplete();
            await this.testRecommendations();
            await this.testInteractions();

            console.log('✅ All tests passed successfully!');
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        }
    }

    async testHealthCheck() {
        console.log('🔍 Testing health check...');

        const response = await this.axios.get('/health');

        if (response.status !== 200) {
            throw new Error(`Health check failed with status ${response.status}`);
        }

        console.log('✅ Health check passed');
        console.log('');
    }

    async testIndexing() {
        console.log('📝 Testing document indexing...');

        // Index products
        const productResponse = await this.axios.post('/api/search/index', {
            documents: testDocuments.filter(doc => doc.type === 'product'),
            index: 'products',
            operation: 'index'
        });

        if (!productResponse.data.success) {
            throw new Error('Product indexing failed');
        }

        // Index hotels
        const hotelResponse = await this.axios.post('/api/search/index', {
            documents: testDocuments.filter(doc => doc.type === 'hotel'),
            index: 'hotels',
            operation: 'index'
        });

        if (!hotelResponse.data.success) {
            throw new Error('Hotel indexing failed');
        }

        console.log('✅ Document indexing passed');
        console.log(`   Products indexed: ${productResponse.data.data.indexed}`);
        console.log(`   Hotels indexed: ${hotelResponse.data.data.indexed}`);
        console.log('');

        // Wait for Elasticsearch to refresh
        await this.sleep(2000);
    }

    async testSearch() {
        console.log('🔍 Testing search functionality...');

        // Basic text search
        const searchResponse = await this.axios.post('/api/search', {
            query: 'iPhone',
            pagination: { page: 1, size: 10 }
        });

        if (!searchResponse.data.success) {
            throw new Error('Search failed');
        }

        const results = searchResponse.data.data;

        if (results.documents.length === 0) {
            throw new Error('No search results found');
        }

        // Test with filters
        const filteredSearchResponse = await this.axios.post('/api/search', {
            filters: {
                type: ['product'],
                priceRange: { min: 500, max: 1500 }
            },
            facets: ['category', 'type'],
            pagination: { page: 1, size: 10 }
        });

        if (!filteredSearchResponse.data.success) {
            throw new Error('Filtered search failed');
        }

        console.log('✅ Search functionality passed');
        console.log(`   Basic search results: ${results.documents.length}`);
        console.log(`   Filtered search results: ${filteredSearchResponse.data.data.documents.length}`);
        console.log('');
    }

    async testAutocomplete() {
        console.log('💡 Testing autocomplete...');

        const autocompleteResponse = await this.axios.get('/api/search/autocomplete', {
            params: {
                q: 'iph',
                type: 'product',
                limit: 5
            }
        });

        if (!autocompleteResponse.data.success) {
            throw new Error('Autocomplete failed');
        }

        // Test popular terms
        const popularTermsResponse = await this.axios.get('/api/search/popular-terms', {
            params: {
                limit: 10
            }
        });

        if (!popularTermsResponse.data.success) {
            throw new Error('Popular terms failed');
        }

        console.log('✅ Autocomplete functionality passed');
        console.log(`   Suggestions count: ${autocompleteResponse.data.data.suggestions.length}`);
        console.log(`   Popular terms count: ${popularTermsResponse.data.data.terms.length}`);
        console.log('');
    }

    async testRecommendations() {
        console.log('🎯 Testing recommendations...');

        const recommendationsResponse = await this.axios.post('/api/search/recommendations', {
            userId: 'test-user-123',
            type: 'product',
            limit: 5,
            algorithm: 'hybrid'
        });

        if (!recommendationsResponse.data.success) {
            throw new Error('Recommendations failed');
        }

        // Test item-based recommendations
        const itemRecommendationsResponse = await this.axios.post('/api/search/recommendations', {
            itemId: 'product-test-1',
            type: 'product',
            limit: 5,
            algorithm: 'content'
        });

        if (!itemRecommendationsResponse.data.success) {
            throw new Error('Item-based recommendations failed');
        }

        console.log('✅ Recommendations functionality passed');
        console.log(`   User recommendations: ${recommendationsResponse.data.data.recommendations.length}`);
        console.log(`   Item recommendations: ${itemRecommendationsResponse.data.data.recommendations.length}`);
        console.log('');
    }

    async testInteractions() {
        console.log('👆 Testing user interactions...');

        const interactionResponse = await this.axios.post('/api/search/interactions', {
            userId: 'test-user-123',
            itemId: 'product-test-1',
            itemType: 'product',
            interactionType: 'view',
            metadata: {
                source: 'search_results',
                position: 1
            }
        });

        if (!interactionResponse.data.success) {
            throw new Error('Recording interaction failed');
        }

        // Record another interaction
        await this.axios.post('/api/search/interactions', {
            userId: 'test-user-123',
            itemId: 'hotel-test-1',
            itemType: 'hotel',
            interactionType: 'click',
            metadata: {
                source: 'recommendations'
            }
        });

        console.log('✅ User interactions functionality passed');
        console.log('');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the tests
async function main() {
    const tester = new SearchServiceTester(BASE_URL);
    await tester.runTests();
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Integration test failed:', error);
        process.exit(1);
    });
}

module.exports = SearchServiceTester;