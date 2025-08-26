import { getRedisClient } from '../redis-client';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

export interface RedisMetrics {
    connected: boolean;
    uptime: number;
    usedMemory: number;
    usedMemoryPeak: number;
    totalCommandsProcessed: number;
    instantaneousOpsPerSec: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRatio: number;
    connectedClients: number;
    blockedClients: number;
    evictedKeys: number;
    expiredKeys: number;
    totalKeys: number;
    replicationRole: string;
    replicationOffset: number;
}

export interface RedisHealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: RedisMetrics;
    issues: string[];
    timestamp: number;
}

/**
 * Redis monitoring and health check utility
 */
export class RedisMonitor extends EventEmitter {
    private redis = getRedisClient();
    private monitoringInterval?: NodeJS.Timeout;
    private healthCheckInterval?: NodeJS.Timeout;
    private isMonitoring = false;
    private lastMetrics?: RedisMetrics;

    constructor() {
        super();
    }

    /**
     * Start monitoring Redis
     */
    startMonitoring(intervalMs: number = 30000): void {
        if (this.isMonitoring) {
            logger.warn('Redis monitoring is already running');
            return;
        }

        this.isMonitoring = true;

        // Start metrics collection
        this.monitoringInterval = setInterval(async () => {
            try {
                const metrics = await this.collectMetrics();
                this.lastMetrics = metrics;
                this.emit('metrics', metrics);

                // Check for alerts
                this.checkAlerts(metrics);
            } catch (error) {
                Logger.error('Error collecting Redis metrics:', error as Error);
                this.emit('error', error);
            }
        }, intervalMs);

        // Start health checks
        this.healthCheckInterval = setInterval(async () => {
            try {
                const health = await this.checkHealth();
                this.emit('health', health);

                if (health.status !== 'healthy') {
                    logger.warn('Redis health check failed:', health);
                }
            } catch (error) {
                Logger.error('Error performing Redis health check:', error as Error);
                this.emit('error', error);
            }
        }, intervalMs / 2); // Health checks more frequently

        Logger.info('Redis monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }

        this.isMonitoring = false;
        Logger.info('Redis monitoring stopped');
    }

    /**
     * Collect Redis metrics
     */
    async collectMetrics(): Promise<RedisMetrics> {
        try {
            const info = await this.redis.getClient().info();
            const keyspaceInfo = await this.redis.getClient().info('keyspace');

            const metrics = this.parseRedisInfo(info, keyspaceInfo);
            return metrics;
        } catch (error) {
            Logger.error('Error collecting Redis metrics:', error as Error);
            throw error;
        }
    }

    /**
     * Parse Redis INFO output
     */
    private parseRedisInfo(info: string, keyspaceInfo: string): RedisMetrics {
        const lines = info.split('\r\n');
        const keyspaceLines = keyspaceInfo.split('\r\n');
        const data: Record<string, string> = {};

        // Parse main info
        lines.forEach(line => {
            if (line.includes(':')) {
                const [key, value] = line.split(':');
                data[key] = value;
            }
        });

        // Parse keyspace info
        let totalKeys = 0;
        keyspaceLines.forEach(line => {
            if (line.startsWith('db')) {
                const match = line.match(/keys=(\d+)/);
                if (match) {
                    totalKeys += parseInt(match[1]);
                }
            }
        });

        const keyspaceHits = parseInt(data.keyspace_hits || '0');
        const keyspaceMisses = parseInt(data.keyspace_misses || '0');
        const totalKeyspaceOps = keyspaceHits + keyspaceMisses;
        const hitRatio = totalKeyspaceOps > 0 ? (keyspaceHits / totalKeyspaceOps) * 100 : 0;

        return {
            connected: true,
            uptime: parseInt(data.uptime_in_seconds || '0'),
            usedMemory: parseInt(data.used_memory || '0'),
            usedMemoryPeak: parseInt(data.used_memory_peak || '0'),
            totalCommandsProcessed: parseInt(data.total_commands_processed || '0'),
            instantaneousOpsPerSec: parseInt(data.instantaneous_ops_per_sec || '0'),
            keyspaceHits,
            keyspaceMisses,
            hitRatio,
            connectedClients: parseInt(data.connected_clients || '0'),
            blockedClients: parseInt(data.blocked_clients || '0'),
            evictedKeys: parseInt(data.evicted_keys || '0'),
            expiredKeys: parseInt(data.expired_keys || '0'),
            totalKeys,
            replicationRole: data.role || 'unknown',
            replicationOffset: parseInt(data.master_repl_offset || data.slave_repl_offset || '0'),
        };
    }

    /**
     * Perform health check
     */
    async checkHealth(): Promise<RedisHealthStatus> {
        const issues: string[] = [];
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        try {
            // Test basic connectivity
            const pingResult = await this.redis.ping();
            if (!pingResult) {
                issues.push('Redis ping failed');
                status = 'unhealthy';
            }

            // Collect metrics
            const metrics = await this.collectMetrics();

            // Check memory usage
            const memoryUsagePercent = (metrics.usedMemory / metrics.usedMemoryPeak) * 100;
            if (memoryUsagePercent > 90) {
                issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
                status = status === 'healthy' ? 'degraded' : status;
            }

            // Check hit ratio
            if (metrics.hitRatio < 80 && metrics.keyspaceHits + metrics.keyspaceMisses > 1000) {
                issues.push(`Low cache hit ratio: ${metrics.hitRatio.toFixed(1)}%`);
                status = status === 'healthy' ? 'degraded' : status;
            }

            // Check connected clients
            if (metrics.connectedClients > 1000) {
                issues.push(`High number of connected clients: ${metrics.connectedClients}`);
                status = status === 'healthy' ? 'degraded' : status;
            }

            // Check blocked clients
            if (metrics.blockedClients > 10) {
                issues.push(`Blocked clients detected: ${metrics.blockedClients}`);
                status = status === 'healthy' ? 'degraded' : status;
            }

            // Check evicted keys
            if (this.lastMetrics && metrics.evictedKeys > this.lastMetrics.evictedKeys) {
                const evictedDiff = metrics.evictedKeys - this.lastMetrics.evictedKeys;
                issues.push(`Keys being evicted: ${evictedDiff} since last check`);
                status = status === 'healthy' ? 'degraded' : status;
            }

            return {
                status,
                metrics,
                issues,
                timestamp: Date.now(),
            };
        } catch (error) {
            Logger.error('Redis health check failed:', error as Error);
            return {
                status: 'unhealthy',
                metrics: {
                    connected: false,
                    uptime: 0,
                    usedMemory: 0,
                    usedMemoryPeak: 0,
                    totalCommandsProcessed: 0,
                    instantaneousOpsPerSec: 0,
                    keyspaceHits: 0,
                    keyspaceMisses: 0,
                    hitRatio: 0,
                    connectedClients: 0,
                    blockedClients: 0,
                    evictedKeys: 0,
                    expiredKeys: 0,
                    totalKeys: 0,
                    replicationRole: 'unknown',
                    replicationOffset: 0,
                },
                issues: [`Redis connection failed: ${(error as Error).message}`],
                timestamp: Date.now(),
            };
        }
    }

    /**
     * Check for alerts based on metrics
     */
    private checkAlerts(metrics: RedisMetrics): void {
        // Memory usage alert
        const memoryUsagePercent = (metrics.usedMemory / metrics.usedMemoryPeak) * 100;
        if (memoryUsagePercent > 95) {
            this.emit('alert', {
                type: 'memory',
                severity: 'critical',
                message: `Redis memory usage is critically high: ${memoryUsagePercent.toFixed(1)}%`,
                metrics,
            });
        } else if (memoryUsagePercent > 85) {
            this.emit('alert', {
                type: 'memory',
                severity: 'warning',
                message: `Redis memory usage is high: ${memoryUsagePercent.toFixed(1)}%`,
                metrics,
            });
        }

        // Hit ratio alert
        if (metrics.hitRatio < 70 && metrics.keyspaceHits + metrics.keyspaceMisses > 1000) {
            this.emit('alert', {
                type: 'performance',
                severity: 'warning',
                message: `Redis cache hit ratio is low: ${metrics.hitRatio.toFixed(1)}%`,
                metrics,
            });
        }

        // Connection alert
        if (metrics.connectedClients > 1500) {
            this.emit('alert', {
                type: 'connections',
                severity: 'warning',
                message: `High number of Redis connections: ${metrics.connectedClients}`,
                metrics,
            });
        }

        // Blocked clients alert
        if (metrics.blockedClients > 50) {
            this.emit('alert', {
                type: 'performance',
                severity: 'critical',
                message: `Many Redis clients are blocked: ${metrics.blockedClients}`,
                metrics,
            });
        }
    }

    /**
     * Get current metrics
     */
    getCurrentMetrics(): RedisMetrics | undefined {
        return this.lastMetrics;
    }

    /**
     * Test Redis performance
     */
    async performanceTest(operations: number = 1000): Promise<{
        setOperations: number;
        getOperations: number;
        avgSetTime: number;
        avgGetTime: number;
        totalTime: number;
    }> {
        const testKey = 'perf_test_';
        const testValue = 'performance_test_value_' + Date.now();

        Logger.info(`Starting Redis performance test with ${operations} operations`);

        const startTime = Date.now();

        // Test SET operations
        const setStartTime = Date.now();
        for (let i = 0; i < operations; i++) {
            await this.redis.set(`${testKey}${i}`, testValue, 60); // 1 minute TTL
        }
        const setEndTime = Date.now();

        // Test GET operations
        const getStartTime = Date.now();
        for (let i = 0; i < operations; i++) {
            await this.redis.get(`${testKey}${i}`);
        }
        const getEndTime = Date.now();

        // Cleanup
        for (let i = 0; i < operations; i++) {
            await this.redis.del(`${testKey}${i}`);
        }

        const totalTime = Date.now() - startTime;
        const setTime = setEndTime - setStartTime;
        const getTime = getEndTime - getStartTime;

        const results = {
            setOperations: operations,
            getOperations: operations,
            avgSetTime: setTime / operations,
            avgGetTime: getTime / operations,
            totalTime,
        };

        Logger.info('Redis performance test completed:', results);
        return results;
    }

    /**
     * Get Redis configuration
     */
    async getConfiguration(): Promise<Record<string, string>> {
        try {
            const config = await this.redis.getClient().config('GET', '*');
            const configObj: Record<string, string> = {};

            for (let i = 0; i < config.length; i += 2) {
                configObj[config[i]] = config[i + 1];
            }

            return configObj;
        } catch (error) {
            Logger.error('Error getting Redis configuration:', error as Error);
            return {};
        }
    }

    /**
     * Get slow log entries
     */
    async getSlowLog(count: number = 10): Promise<any[]> {
        try {
            return await this.redis.getClient().slowlog('GET', count);
        } catch (error) {
            Logger.error('Error getting Redis slow log:', error as Error);
            return [];
        }
    }
}

// Export singleton instance
export const redisMonitor = new RedisMonitor();