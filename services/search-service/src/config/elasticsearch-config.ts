import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';

export interface ElasticsearchConfig {
    url: string;
    username?: string;
    password?: string;
    indexPrefix: string;
}

export class ElasticsearchClient {
    private client: Client;
    private config: ElasticsearchConfig;

    constructor(config: ElasticsearchConfig) {
        this.config = config;
        this.client = new Client({
            node: config.url,
            auth: config.username && config.password ? {
                username: config.username,
                password: config.password
            } : undefined,
            requestTimeout: 30000,
            pingTimeout: 3000,
            sniffOnStart: false,
            sniffOnConnectionFault: false,
        });
    }

    /**
     * Get the Elasticsearch client instance
     */
    getClient(): Client {
        return this.client;
    }

    /**
     * Test connection to Elasticsearch
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.client.ping();
            logger.info('Elasticsearch connection successful');
            return true;
        } catch (error) {
            logger.error('Elasticsearch connection failed:', error);
            return false;
        }
    }

    /**
     * Get index name with prefix
     */
    getIndexName(baseName: string): string {
        return `${this.config.indexPrefix}${baseName}`;
    }

    /**
     * Create index with mapping if it doesn't exist
     */
    async createIndexIfNotExists(indexName: string, mapping: any): Promise<void> {
        try {
            const fullIndexName = this.getIndexName(indexName);
            const exists = await this.client.indices.exists({ index: fullIndexName });

            if (!exists) {
                await this.client.indices.create({
                    index: fullIndexName,
                    body: {
                        mappings: mapping,
                        settings: {
                            number_of_shards: 1,
                            number_of_replicas: 0,
                            analysis: {
                                analyzer: {
                                    autocomplete_analyzer: {
                                        type: 'custom',
                                        tokenizer: 'standard',
                                        filter: ['lowercase', 'autocomplete_filter']
                                    },
                                    search_analyzer: {
                                        type: 'custom',
                                        tokenizer: 'standard',
                                        filter: ['lowercase']
                                    }
                                },
                                filter: {
                                    autocomplete_filter: {
                                        type: 'edge_ngram',
                                        min_gram: 2,
                                        max_gram: 20
                                    }
                                }
                            }
                        }
                    }
                });
                logger.info(`Created index: ${fullIndexName}`);
            }
        } catch (error) {
            logger.error(`Error creating index ${indexName}:`, error);
            throw error;
        }
    }

    /**
     * Close the Elasticsearch connection
     */
    async close(): Promise<void> {
        await this.client.close();
    }
}