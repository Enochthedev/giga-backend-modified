import { SessionData, Store } from 'express-session';
import { getRedisClient } from './redis-client';
import { Logger } from '../utils/logger';

export interface SessionConfig {
    prefix?: string;
    ttl?: number;
    serializer?: {
        stringify: (obj: any) => string;
        parse: (str: string) => any;
    };
}

/**
 * Redis session store for express-session
 */
export class RedisSessionStore extends Store {
    private redis = getRedisClient();
    private prefix: string;
    private ttl: number;
    private serializer: {
        stringify: (obj: any) => string;
        parse: (str: string) => any;
    };

    constructor(config: SessionConfig = {}) {
        super();
        this.prefix = config.prefix || 'sess:';
        this.ttl = config.ttl || 86400; // 24 hours default
        this.serializer = config.serializer || {
            stringify: JSON.stringify,
            parse: JSON.parse,
        };
    }

    /**
     * Get session data
     */
    get(sid: string, callback: (err?: any, session?: SessionData | null) => void): void {
        const key = this.prefix + sid;

        this.redis.get(key)
            .then((data) => {
                if (!data) {
                    return callback(null, null);
                }

                try {
                    const session = this.serializer.parse(data);
                    callback(null, session);
                } catch (error) {
                    Logger.error(`Error parsing session ${sid}:`, error as Error);
                    callback(error);
                }
            })
            .catch((error) => {
                Logger.error(`Error getting session ${sid}:`, error as Error);
                callback(error);
            });
    }

    /**
     * Set session data
     */
    set(sid: string, session: SessionData, callback?: (err?: any) => void): void {
        const key = this.prefix + sid;

        try {
            const serializedSession = this.serializer.stringify(session);

            // Calculate TTL from session.cookie.maxAge or use default
            let ttl = this.ttl;
            if (session.cookie && session.cookie.maxAge) {
                ttl = Math.floor(session.cookie.maxAge / 1000);
            }

            this.redis.set(key, serializedSession, ttl)
                .then(() => {
                    if (callback) callback();
                })
                .catch((error) => {
                    Logger.error(`Error setting session ${sid}:`, error as Error);
                    if (callback) callback(error);
                });
        } catch (error) {
            Logger.error(`Error serializing session ${sid}:`, error as Error);
            if (callback) callback(error);
        }
    }

    /**
     * Destroy session
     */
    destroy(sid: string, callback?: (err?: any) => void): void {
        const key = this.prefix + sid;

        this.redis.del(key)
            .then(() => {
                if (callback) callback();
            })
            .catch((error) => {
                Logger.error(`Error destroying session ${sid}:`, error as Error);
                if (callback) callback(error);
            });
    }

    /**
     * Touch session (update TTL)
     */
    touch(sid: string, session: SessionData, callback?: (err?: any) => void): void {
        const key = this.prefix + sid;

        // Calculate TTL from session.cookie.maxAge or use default
        let ttl = this.ttl;
        if (session.cookie && session.cookie.maxAge) {
            ttl = Math.floor(session.cookie.maxAge / 1000);
        }

        this.redis.expire(key, ttl)
            .then(() => {
                if (callback) callback();
            })
            .catch((error) => {
                Logger.error(`Error touching session ${sid}:`, error as Error);
                if (callback) callback(error);
            });
    }

    /**
     * Get all session IDs
     */
    all(callback: (err?: any, obj?: SessionData[] | null) => void): void {
        const pattern = this.prefix + '*';

        this.redis.getClient().keys(pattern)
            .then(async (keys) => {
                if (keys.length === 0) {
                    return callback(null, []);
                }

                try {
                    const sessions: SessionData[] = [];

                    for (const key of keys) {
                        const data = await this.redis.get(key);
                        if (data) {
                            const session = this.serializer.parse(data);
                            sessions.push(session);
                        }
                    }

                    callback(null, sessions);
                } catch (error) {
                    Logger.error('Error getting all sessions:', error as Error);
                    callback(error);
                }
            })
            .catch((error) => {
                Logger.error('Error getting session keys:', error as Error);
                callback(error);
            });
    }

    /**
     * Get session count
     */
    length(callback: (err?: any, length?: number) => void): void {
        const pattern = this.prefix + '*';

        this.redis.getClient().keys(pattern)
            .then((keys) => {
                callback(null, keys.length);
            })
            .catch((error) => {
                Logger.error('Error getting session count:', error as Error);
                callback(error);
            });
    }

    /**
     * Clear all sessions
     */
    clear(callback?: (err?: any) => void): void {
        const pattern = this.prefix + '*';

        this.redis.delPattern(pattern)
            .then(() => {
                if (callback) callback();
            })
            .catch((error) => {
                Logger.error('Error clearing sessions:', error as Error);
                if (callback) callback(error);
            });
    }
}

/**
 * Session management utilities
 */
export class SessionManager {
    private redis = getRedisClient();
    private prefix: string;

    constructor(prefix: string = 'sess:') {
        this.prefix = prefix;
    }

    /**
     * Get active sessions for a user
     */
    async getUserSessions(userId: string): Promise<string[]> {
        try {
            const userSessionsKey = `user:${userId}:sessions`;
            return await this.redis.smembers(userSessionsKey);
        } catch (error) {
            Logger.error(`Error getting user sessions for ${userId}:`, error as Error);
            return [];
        }
    }

    /**
     * Add session to user's active sessions
     */
    async addUserSession(userId: string, sessionId: string, ttl: number = 86400): Promise<void> {
        try {
            const userSessionsKey = `user:${userId}:sessions`;
            await this.redis.sadd(userSessionsKey, sessionId);
            await this.redis.expire(userSessionsKey, ttl);

            // Also store reverse mapping
            const sessionUserKey = `session:${sessionId}:user`;
            await this.redis.set(sessionUserKey, userId, ttl);
        } catch (error) {
            Logger.error(`Error adding user session ${sessionId} for ${userId}:`, error as Error);
        }
    }

    /**
     * Remove session from user's active sessions
     */
    async removeUserSession(userId: string, sessionId: string): Promise<void> {
        try {
            const userSessionsKey = `user:${userId}:sessions`;
            await this.redis.getClient().srem(userSessionsKey, sessionId);

            // Remove reverse mapping
            const sessionUserKey = `session:${sessionId}:user`;
            await this.redis.del(sessionUserKey);
        } catch (error) {
            Logger.error(`Error removing user session ${sessionId} for ${userId}:`, error as Error);
        }
    }

    /**
     * Destroy all sessions for a user
     */
    async destroyUserSessions(userId: string): Promise<number> {
        try {
            const sessionIds = await this.getUserSessions(userId);
            let destroyedCount = 0;

            for (const sessionId of sessionIds) {
                const sessionKey = this.prefix + sessionId;
                const deleted = await this.redis.del(sessionKey);
                if (deleted) {
                    destroyedCount++;
                }

                // Clean up reverse mapping
                await this.removeUserSession(userId, sessionId);
            }

            // Clear user sessions set
            const userSessionsKey = `user:${userId}:sessions`;
            await this.redis.del(userSessionsKey);

            Logger.info(`Destroyed ${destroyedCount} sessions for user ${userId}`);
            return destroyedCount;
        } catch (error) {
            Logger.error(`Error destroying user sessions for ${userId}:`, error as Error);
            return 0;
        }
    }

    /**
     * Get session info
     */
    async getSessionInfo(sessionId: string): Promise<{
        userId?: string;
        data?: SessionData;
        ttl?: number;
    } | null> {
        try {
            const sessionKey = this.prefix + sessionId;
            const sessionUserKey = `session:${sessionId}:user`;

            const [sessionData, userId, ttl] = await Promise.all([
                this.redis.get(sessionKey),
                this.redis.get(sessionUserKey),
                this.redis.ttl(sessionKey)
            ]);

            if (!sessionData) {
                return null;
            }

            return {
                userId,
                data: sessionData,
                ttl: ttl > 0 ? ttl : undefined
            };
        } catch (error) {
            Logger.error(`Error getting session info for ${sessionId}:`, error as Error);
            return null;
        }
    }

    /**
     * Extend session TTL
     */
    async extendSession(sessionId: string, ttlSeconds: number): Promise<boolean> {
        try {
            const sessionKey = this.prefix + sessionId;
            const sessionUserKey = `session:${sessionId}:user`;

            const [sessionExtended, userMappingExtended] = await Promise.all([
                this.redis.expire(sessionKey, ttlSeconds),
                this.redis.expire(sessionUserKey, ttlSeconds)
            ]);

            return sessionExtended && userMappingExtended;
        } catch (error) {
            Logger.error(`Error extending session ${sessionId}:`, error as Error);
            return false;
        }
    }

    /**
     * Get session statistics
     */
    async getSessionStats(): Promise<{
        totalSessions: number;
        activeSessions: number;
        expiredSessions: number;
    }> {
        try {
            const pattern = this.prefix + '*';
            const keys = await this.redis.getClient().keys(pattern);

            let activeSessions = 0;
            let expiredSessions = 0;

            for (const key of keys) {
                const ttl = await this.redis.ttl(key);
                if (ttl > 0) {
                    activeSessions++;
                } else if (ttl === -1) {
                    // Key exists but has no expiration
                    activeSessions++;
                } else {
                    expiredSessions++;
                }
            }

            return {
                totalSessions: keys.length,
                activeSessions,
                expiredSessions
            };
        } catch (error) {
            Logger.error('Error getting session stats:', error as Error);
            return {
                totalSessions: 0,
                activeSessions: 0,
                expiredSessions: 0
            };
        }
    }
}

// Export singleton session manager
export const sessionManager = new SessionManager();