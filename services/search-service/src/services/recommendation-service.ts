import { Client } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '../config/elasticsearch-config';
import { RedisClient } from '../config/redis-config';
import {
    RecommendationQuery,
    RecommendationResult,
    RecommendationItem,
    UserInteraction,
    SearchDocument
} from '../types/search-types';
import { RecommendationError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class RecommendationService {
    private esClient: Client;
    private redisClient: RedisClient;
    private esConfig: ElasticsearchClient;

    constructor(esConfig: ElasticsearchClient, redisClient: RedisClient) {
        this.esConfig = esConfig;
        this.esClient = esConfig.getClient();
        this.redisClient = redisClient;
    }

    /**
     * Initialize recommendation indices
     */
    async initializeRecommendationIndices(): Promise<void> {
        try {
            // User interactions index mapping
            const interactionMapping = {
                properties: {
                    userId: { type: 'keyword' },
                    itemId: { type: 'keyword' },
                    itemType: { type: 'keyword' },
                    interactionType: { type: 'keyword' },
                    timestamp: { type: 'date' },
                    metadata: { type: 'object' }
                }
            };

            await this.esConfig.createIndexIfNotExists('user_interactions', interactionMapping);
            logger.info('Recommendation indices initialized successfully');
        } catch (error) {
            logger.error('Error initializing recommendation indices:', error);
            throw new RecommendationError('Failed to initialize recommendation indices');
        }
    }

    /**
     * Get recommendations for a user or item
     */
    async getRecommendations(query: RecommendationQuery): Promise<RecommendationResult> {
        const startTime = Date.now();

        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(query);
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            let recommendations: RecommendationItem[] = [];
            let algorithm = 'hybrid';

            switch (query.algorithm) {
                case 'collaborative':
                    recommendations = await this.getCollaborativeRecommendations(query);
                    algorithm = 'collaborative';
                    break;
                case 'content':
                    recommendations = await this.getContentBasedRecommendations(query);
                    algorithm = 'content';
                    break;
                default:
                    // Hybrid approach - combine both methods
                    const [collaborative, contentBased] = await Promise.all([
                        this.getCollaborativeRecommendations(query),
                        this.getContentBasedRecommendations(query)
                    ]);
                    recommendations = this.combineRecommendations(collaborative, contentBased, query.limit || 10);
                    algorithm = 'hybrid';
            }

            const result: RecommendationResult = {
                recommendations: recommendations.slice(0, query.limit || 10),
                algorithm,
                took: Date.now() - startTime
            };

            // Cache the result
            await this.setCache(cacheKey, JSON.stringify(result), 1800); // 30 minutes

            return result;
        } catch (error) {
            logger.error('Error getting recommendations:', error);
            throw new RecommendationError('Recommendation operation failed');
        }
    }

    /**
     * Get collaborative filtering recommendations
     */
    private async getCollaborativeRecommendations(query: RecommendationQuery): Promise<RecommendationItem[]> {
        try {
            if (!query.userId) {
                return [];
            }

            // Get user's interaction history
            const userInteractions = await this.getUserInteractions(query.userId);
            if (userInteractions.length === 0) {
                return await this.getPopularItems(query.type, query.limit || 10);
            }

            // Find similar users based on interaction patterns
            const similarUsers = await this.findSimilarUsers(query.userId, userInteractions);

            // Get recommendations based on similar users' preferences
            const recommendations: RecommendationItem[] = [];

            for (const similarUser of similarUsers.slice(0, 5)) {
                const similarUserInteractions = await this.getUserInteractions(similarUser.userId);

                for (const interaction of similarUserInteractions) {
                    // Skip items the user has already interacted with
                    if (userInteractions.some(ui => ui.itemId === interaction.itemId)) {
                        continue;
                    }

                    // Get item details
                    const item = await this.getItemById(interaction.itemId, interaction.itemType);
                    if (item) {
                        const existingRec = recommendations.find(r => r.id === item.id);
                        if (existingRec) {
                            existingRec.score += similarUser.similarity * this.getInteractionWeight(interaction.interactionType);
                        } else {
                            recommendations.push({
                                id: item.id,
                                type: item.type,
                                title: item.title,
                                score: similarUser.similarity * this.getInteractionWeight(interaction.interactionType),
                                reason: `Users with similar preferences also liked this`,
                                metadata: {
                                    category: item.category,
                                    price: item.price,
                                    rating: item.rating
                                }
                            });
                        }
                    }
                }
            }

            return recommendations.sort((a, b) => b.score - a.score);
        } catch (error) {
            logger.warn('Error getting collaborative recommendations:', error);
            return [];
        }
    }

    /**
     * Get content-based recommendations
     */
    private async getContentBasedRecommendations(query: RecommendationQuery): Promise<RecommendationItem[]> {
        try {
            let seedItem: SearchDocument | null = null;

            if (query.itemId) {
                // Item-to-item recommendations
                seedItem = await this.getItemById(query.itemId, query.type);
            } else if (query.userId) {
                // User preference-based recommendations
                const userInteractions = await this.getUserInteractions(query.userId);
                if (userInteractions.length > 0) {
                    // Use the most recent high-value interaction as seed
                    const recentInteraction = userInteractions
                        .filter(i => ['purchase', 'like'].includes(i.interactionType))
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                    if (recentInteraction) {
                        seedItem = await this.getItemById(recentInteraction.itemId, recentInteraction.itemType);
                    }
                }
            }

            if (!seedItem) {
                return await this.getPopularItems(query.type, query.limit || 10);
            }

            // Find similar items using More Like This query
            const response = await this.esClient.search({
                index: this.getSearchIndices(query.type),
                body: {
                    query: {
                        more_like_this: {
                            fields: ['title', 'description', 'category', 'tags'],
                            like: [
                                {
                                    _index: this.getItemIndex(seedItem.type),
                                    _id: seedItem.id
                                }
                            ],
                            min_term_freq: 1,
                            max_query_terms: 12,
                            min_doc_freq: 1
                        }
                    },
                    size: (query.limit || 10) * 2 // Get more to filter out the seed item
                }
            });

            const recommendations: RecommendationItem[] = [];

            if (response.hits?.hits) {
                response.hits.hits.forEach((hit: any) => {
                    // Skip the seed item itself
                    if (hit._source.id === seedItem?.id) {
                        return;
                    }

                    recommendations.push({
                        id: hit._source.id,
                        type: hit._source.type,
                        title: hit._source.title,
                        score: hit._score,
                        reason: `Similar to "${seedItem?.title}"`,
                        metadata: {
                            category: hit._source.category,
                            price: hit._source.price,
                            rating: hit._source.rating
                        }
                    });
                });
            }

            return recommendations;
        } catch (error) {
            logger.warn('Error getting content-based recommendations:', error);
            return [];
        }
    }

    /**
     * Record user interaction for future recommendations
     */
    async recordInteraction(interaction: UserInteraction): Promise<void> {
        try {
            const indexName = this.esConfig.getIndexName('user_interactions');

            await this.esClient.index({
                index: indexName,
                body: {
                    ...interaction,
                    timestamp: interaction.timestamp || new Date()
                }
            });

            // Update user interaction cache
            const cacheKey = `user_interactions:${interaction.userId}`;
            await this.redisClient.del(cacheKey); // Invalidate cache

            logger.info(`Recorded interaction: ${interaction.interactionType} for user ${interaction.userId} on item ${interaction.itemId}`);
        } catch (error) {
            logger.error('Error recording user interaction:', error);
            throw new RecommendationError('Failed to record user interaction');
        }
    }

    /**
     * Get user's interaction history
     */
    private async getUserInteractions(userId: string): Promise<UserInteraction[]> {
        try {
            // Check cache first
            const cacheKey = `user_interactions:${userId}`;
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const indexName = this.esConfig.getIndexName('user_interactions');
            const response = await this.esClient.search({
                index: indexName,
                body: {
                    query: {
                        term: { userId }
                    },
                    sort: [{ timestamp: { order: 'desc' } }],
                    size: 100 // Limit to recent interactions
                }
            });

            const interactions: UserInteraction[] = [];
            if (response.hits?.hits) {
                response.hits.hits.forEach((hit: any) => {
                    interactions.push(hit._source);
                });
            }

            // Cache the result
            await this.setCache(cacheKey, JSON.stringify(interactions), 600); // 10 minutes

            return interactions;
        } catch (error) {
            logger.warn('Error getting user interactions:', error);
            return [];
        }
    }

    /**
     * Find users with similar interaction patterns
     */
    private async findSimilarUsers(userId: string, userInteractions: UserInteraction[]): Promise<Array<{ userId: string, similarity: number }>> {
        try {
            // Get items the user has interacted with
            const userItems = userInteractions.map(i => i.itemId);

            if (userItems.length === 0) {
                return [];
            }

            // Find other users who interacted with the same items
            const indexName = this.esConfig.getIndexName('user_interactions');
            const response = await this.esClient.search({
                index: indexName,
                body: {
                    query: {
                        bool: {
                            must: [
                                { terms: { itemId: userItems } },
                                { bool: { must_not: { term: { userId } } } }
                            ]
                        }
                    },
                    aggs: {
                        similar_users: {
                            terms: {
                                field: 'userId',
                                size: 20
                            },
                            aggs: {
                                common_items: {
                                    cardinality: {
                                        field: 'itemId'
                                    }
                                }
                            }
                        }
                    },
                    size: 0
                }
            });

            const similarUsers: Array<{ userId: string, similarity: number }> = [];

            if (response.aggregations?.similar_users?.buckets) {
                response.aggregations.similar_users.buckets.forEach((bucket: any) => {
                    const commonItems = bucket.common_items.value;
                    const similarity = commonItems / userItems.length; // Jaccard similarity approximation

                    if (similarity > 0.1) { // Minimum similarity threshold
                        similarUsers.push({
                            userId: bucket.key,
                            similarity
                        });
                    }
                });
            }

            return similarUsers.sort((a, b) => b.similarity - a.similarity);
        } catch (error) {
            logger.warn('Error finding similar users:', error);
            return [];
        }
    }

    /**
     * Get popular items as fallback recommendations
     */
    private async getPopularItems(type?: string, limit: number = 10): Promise<RecommendationItem[]> {
        try {
            const response = await this.esClient.search({
                index: this.getSearchIndices(type),
                body: {
                    query: { match_all: {} },
                    sort: [
                        { rating: { order: 'desc' } },
                        { reviewCount: { order: 'desc' } }
                    ],
                    size: limit
                }
            });

            const recommendations: RecommendationItem[] = [];

            if (response.hits?.hits) {
                response.hits.hits.forEach((hit: any) => {
                    recommendations.push({
                        id: hit._source.id,
                        type: hit._source.type,
                        title: hit._source.title,
                        score: hit._source.rating || 0,
                        reason: 'Popular item',
                        metadata: {
                            category: hit._source.category,
                            price: hit._source.price,
                            rating: hit._source.rating
                        }
                    });
                });
            }

            return recommendations;
        } catch (error) {
            logger.warn('Error getting popular items:', error);
            return [];
        }
    }

    /**
     * Get item by ID
     */
    private async getItemById(itemId: string, itemType?: string): Promise<SearchDocument | null> {
        try {
            const response = await this.esClient.search({
                index: this.getSearchIndices(itemType),
                body: {
                    query: {
                        term: { id: itemId }
                    },
                    size: 1
                }
            });

            if (response.hits?.hits?.[0]) {
                return response.hits.hits[0]._source;
            }

            return null;
        } catch (error) {
            logger.warn('Error getting item by ID:', error);
            return null;
        }
    }

    /**
     * Combine collaborative and content-based recommendations
     */
    private combineRecommendations(
        collaborative: RecommendationItem[],
        contentBased: RecommendationItem[],
        limit: number
    ): RecommendationItem[] {
        const combined = new Map<string, RecommendationItem>();

        // Add collaborative recommendations with higher weight
        collaborative.forEach(item => {
            combined.set(item.id, {
                ...item,
                score: item.score * 0.7, // 70% weight for collaborative
                reason: item.reason
            });
        });

        // Add content-based recommendations
        contentBased.forEach(item => {
            const existing = combined.get(item.id);
            if (existing) {
                existing.score += item.score * 0.3; // 30% weight for content-based
                existing.reason = 'Similar preferences and content';
            } else {
                combined.set(item.id, {
                    ...item,
                    score: item.score * 0.3,
                    reason: item.reason
                });
            }
        });

        return Array.from(combined.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Get interaction weight for scoring
     */
    private getInteractionWeight(interactionType: string): number {
        switch (interactionType) {
            case 'purchase': return 1.0;
            case 'like': return 0.8;
            case 'share': return 0.6;
            case 'click': return 0.4;
            case 'view': return 0.2;
            default: return 0.1;
        }
    }

    /**
     * Get search indices based on type
     */
    private getSearchIndices(type?: string): string {
        if (!type) {
            return this.esConfig.getIndexName('*');
        }

        switch (type) {
            case 'product':
                return this.esConfig.getIndexName('products');
            case 'hotel':
                return this.esConfig.getIndexName('hotels');
            default:
                return this.esConfig.getIndexName('*');
        }
    }

    /**
     * Get item index based on type
     */
    private getItemIndex(type: string): string {
        switch (type) {
            case 'product':
                return this.esConfig.getIndexName('products');
            case 'hotel':
                return this.esConfig.getIndexName('hotels');
            default:
                return this.esConfig.getIndexName('products');
        }
    }

    /**
     * Generate cache key for recommendations
     */
    private generateCacheKey(query: RecommendationQuery): string {
        const parts = [
            'recommendations',
            query.userId || 'anonymous',
            query.itemId || 'none',
            query.type || 'all',
            query.algorithm || 'hybrid',
            query.limit || 10
        ];
        return parts.join(':');
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
}