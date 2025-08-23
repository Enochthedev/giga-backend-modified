import { Client } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '../config/elasticsearch-config';
import { RedisClient } from '../config/redis-config';
import {
    AutocompleteQuery,
    AutocompleteResult,
    AutocompleteSuggestion
} from '../types/search-types';
import { ElasticsearchError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class AutocompleteService {
    private esClient: Client;
    private redisClient: RedisClient;
    private esConfig: ElasticsearchClient;

    constructor(esConfig: ElasticsearchClient, redisClient: RedisClient) {
        this.esConfig = esConfig;
        this.esClient = esConfig.getClient();
        this.redisClient = redisClient;
    }

    /**
     * Get autocomplete suggestions
     */
    async getSuggestions(query: AutocompleteQuery): Promise<AutocompleteResult> {
        const startTime = Date.now();

        try {
            if (!query.query || query.query.length < (parseInt(process.env.AUTOCOMPLETE_MIN_LENGTH || '2'))) {
                throw new ValidationError('Query too short for autocomplete');
            }

            // Check cache first
            const cacheKey = this.generateCacheKey(query);
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const suggestions = await Promise.all([
                this.getCompletionSuggestions(query),
                this.getTermSuggestions(query),
                this.getPhraseSuggestions(query)
            ]);

            const result = this.mergeSuggestions(suggestions, query.limit || 10);
            result.took = Date.now() - startTime;

            // Cache the result
            await this.setCache(cacheKey, JSON.stringify(result), 600); // 10 minutes

            return result;
        } catch (error) {
            logger.error('Error getting autocomplete suggestions:', error);
            throw new ElasticsearchError('Autocomplete operation failed', error);
        }
    }

    /**
     * Get completion suggestions using Elasticsearch completion suggester
     */
    private async getCompletionSuggestions(query: AutocompleteQuery): Promise<AutocompleteSuggestion[]> {
        try {
            const indices = this.getAutocompleteIndices(query.type);

            const response = await this.esClient.search({
                index: indices,
                body: {
                    suggest: {
                        title_suggest: {
                            prefix: query.query,
                            completion: {
                                field: 'title.suggest',
                                size: query.limit || 10,
                                skip_duplicates: true
                            }
                        }
                    },
                    _source: ['id', 'title', 'type', 'category']
                }
            });

            const suggestions: AutocompleteSuggestion[] = [];

            if (response.suggest?.title_suggest) {
                response.suggest.title_suggest.forEach((suggest: any) => {
                    suggest.options.forEach((option: any) => {
                        suggestions.push({
                            text: option.text,
                            type: option._source.type,
                            score: option._score,
                            metadata: {
                                id: option._source.id,
                                category: option._source.category
                            }
                        });
                    });
                });
            }

            return suggestions;
        } catch (error) {
            logger.warn('Error getting completion suggestions:', error);
            return [];
        }
    }

    /**
     * Get term suggestions for typo correction
     */
    private async getTermSuggestions(query: AutocompleteQuery): Promise<AutocompleteSuggestion[]> {
        try {
            const indices = this.getAutocompleteIndices(query.type);

            const response = await this.esClient.search({
                index: indices,
                body: {
                    suggest: {
                        term_suggest: {
                            text: query.query,
                            term: {
                                field: 'title',
                                size: 3,
                                suggest_mode: 'popular',
                                min_word_length: 3
                            }
                        }
                    }
                }
            });

            const suggestions: AutocompleteSuggestion[] = [];

            if (response.suggest?.term_suggest) {
                response.suggest.term_suggest.forEach((suggest: any) => {
                    suggest.options.forEach((option: any) => {
                        suggestions.push({
                            text: option.text,
                            type: 'correction',
                            score: option.score,
                            metadata: {
                                original: suggest.text,
                                frequency: option.freq
                            }
                        });
                    });
                });
            }

            return suggestions;
        } catch (error) {
            logger.warn('Error getting term suggestions:', error);
            return [];
        }
    }

    /**
     * Get phrase suggestions for better query completion
     */
    private async getPhraseSuggestions(query: AutocompleteQuery): Promise<AutocompleteSuggestion[]> {
        try {
            const indices = this.getAutocompleteIndices(query.type);

            const response = await this.esClient.search({
                index: indices,
                body: {
                    suggest: {
                        phrase_suggest: {
                            text: query.query,
                            phrase: {
                                field: 'title',
                                size: 3,
                                gram_size: 2,
                                direct_generator: [{
                                    field: 'title',
                                    suggest_mode: 'always',
                                    min_word_length: 1
                                }],
                                highlight: {
                                    pre_tag: '<em>',
                                    post_tag: '</em>'
                                }
                            }
                        }
                    }
                }
            });

            const suggestions: AutocompleteSuggestion[] = [];

            if (response.suggest?.phrase_suggest) {
                response.suggest.phrase_suggest.forEach((suggest: any) => {
                    suggest.options.forEach((option: any) => {
                        suggestions.push({
                            text: option.text,
                            type: 'phrase',
                            score: option.score,
                            metadata: {
                                highlighted: option.highlighted
                            }
                        });
                    });
                });
            }

            return suggestions;
        } catch (error) {
            logger.warn('Error getting phrase suggestions:', error);
            return [];
        }
    }

    /**
     * Get popular search terms from cache/analytics
     */
    async getPopularSearchTerms(type?: string, limit: number = 10): Promise<string[]> {
        try {
            const cacheKey = `popular_terms:${type || 'all'}`;
            const cached = await this.getFromCache(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            // In a real implementation, this would come from analytics data
            // For now, return some default popular terms
            const popularTerms = [
                'laptop', 'smartphone', 'headphones', 'camera', 'tablet',
                'hotel', 'apartment', 'vacation rental', 'resort', 'hostel'
            ];

            await this.setCache(cacheKey, JSON.stringify(popularTerms), 3600); // 1 hour
            return popularTerms.slice(0, limit);
        } catch (error) {
            logger.warn('Error getting popular search terms:', error);
            return [];
        }
    }

    /**
     * Record search query for analytics and improvement
     */
    async recordSearchQuery(query: string, type?: string, userId?: string): Promise<void> {
        try {
            const searchLog = {
                query,
                type,
                userId,
                timestamp: new Date().toISOString()
            };

            // In a real implementation, this would be sent to an analytics service
            // or stored in a dedicated search analytics index
            logger.info('Search query recorded:', searchLog);
        } catch (error) {
            logger.warn('Error recording search query:', error);
        }
    }

    /**
     * Merge and rank suggestions from different sources
     */
    private mergeSuggestions(
        suggestionArrays: AutocompleteSuggestion[][],
        limit: number
    ): AutocompleteResult {
        const allSuggestions: AutocompleteSuggestion[] = [];

        // Flatten all suggestions
        suggestionArrays.forEach(suggestions => {
            allSuggestions.push(...suggestions);
        });

        // Remove duplicates and sort by score
        const uniqueSuggestions = new Map<string, AutocompleteSuggestion>();

        allSuggestions.forEach(suggestion => {
            const existing = uniqueSuggestions.get(suggestion.text);
            if (!existing || suggestion.score > existing.score) {
                uniqueSuggestions.set(suggestion.text, suggestion);
            }
        });

        // Sort by score and limit results
        const sortedSuggestions = Array.from(uniqueSuggestions.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return {
            suggestions: sortedSuggestions,
            took: 0 // Will be set by caller
        };
    }

    /**
     * Get autocomplete indices based on type
     */
    private getAutocompleteIndices(type?: string): string {
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
     * Generate cache key for autocomplete queries
     */
    private generateCacheKey(query: AutocompleteQuery): string {
        const key = `autocomplete:${query.query}:${query.type || 'all'}:${query.limit || 10}`;
        return key.toLowerCase();
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