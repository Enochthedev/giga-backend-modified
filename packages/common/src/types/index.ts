/**
 * Common types and interfaces used across all services
 */

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    timestamp: Date;
    requestId?: string | undefined;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: Role[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Role {
    id: string;
    name: string;
    permissions: Permission[];
}

export interface Permission {
    id: string;
    name: string;
    resource: string;
    action: string;
}

export interface DomainEvent {
    id: string;
    type: string;
    aggregateId: string;
    aggregateType: string;
    data: any;
    metadata: EventMetadata;
    timestamp: Date;
    version: number;
}

export interface EventMetadata {
    userId?: string;
    correlationId: string;
    causationId?: string;
    source: string;
}

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
}

export interface MessageQueueConfig {
    url: string;
    exchange: string;
    queues: QueueConfig[];
}

export interface QueueConfig {
    name: string;
    routingKey: string;
    durable: boolean;
    autoDelete: boolean;
}

export interface ServiceConfig {
    name: string;
    version: string;
    port: number;
    environment: 'development' | 'staging' | 'production';
    database: DatabaseConfig;
    messageQueue: MessageQueueConfig;
    redis: {
        host: string;
        port: number;
        password?: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
}