export class SearchServiceError extends Error {
    public statusCode: number;
    public code: string;

    constructor(message: string, statusCode: number = 500, code: string = 'SEARCH_ERROR') {
        super(message);
        this.name = 'SearchServiceError';
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends SearchServiceError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class ElasticsearchError extends SearchServiceError {
    constructor(message: string, originalError?: any) {
        super(message, 500, 'ELASTICSEARCH_ERROR');
        this.name = 'ElasticsearchError';
        if (originalError) {
            this.stack = originalError.stack;
        }
    }
}

export class CacheError extends SearchServiceError {
    constructor(message: string) {
        super(message, 500, 'CACHE_ERROR');
        this.name = 'CacheError';
    }
}

export class RecommendationError extends SearchServiceError {
    constructor(message: string) {
        super(message, 500, 'RECOMMENDATION_ERROR');
        this.name = 'RecommendationError';
    }
}

export class IndexingError extends SearchServiceError {
    constructor(message: string) {
        super(message, 500, 'INDEXING_ERROR');
        this.name = 'IndexingError';
    }
}