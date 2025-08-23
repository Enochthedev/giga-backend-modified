import { RedisClient, CacheConfig } from '../redis-client';
import { logger } from '../../logger';

// Mock logger to avoid console output during tests
jest.mock('../../logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('RedisClient', () => {
    let redisClient: RedisClient;
    let config: CacheConfig;

    beforeEach(() => {
        config = {
            host: 'localhost',
            port: 6379,
            db: 15, // Use test database
            keyPrefix: 'test:',
            lazyConnect: true,
        };
    });

    afterEach(async () => {
        if (redisClient) {
            await redisClient.disconnect();
        }
    });

    describe('Basic Operations', () => {
        beforeEach(() => {
            redisClient = new RedisClient(config);
        });

        it('should create a Redis client instance', () => {
            expect(redisClient).toBeInstanceOf(RedisClient);
        });

        it('should set and get a value', async () => {
            const key = 'test:key';
            const value = { message: 'Hello, Redis!' };

            const setResult = await redisClient.set(key, value);
            expect(setResult).toBe(true);

            const getValue = await redisClient.get(key);
            expect(getValue).toEqual(value);
        });

        it('should set a value with TTL', async () => {
            const key = 'test:ttl';
            const value = 'expires soon';
            const ttl = 2; // 2 seconds

            await redisClient.set(key, value, ttl);

            // Value should exist immediately
            const getValue = await redisClient.get(key);
            expect(getValue).toBe(value);

            // Check TTL
            const remainingTtl = await redisClient.ttl(key);
            expect(remainingTtl).toBeGreaterThan(0);
            expect(remainingTtl).toBeLessThanOrEqual(ttl);
        });

        it('should delete a key', async () => {
            const key = 'test:delete';
            const value = 'to be deleted';

            await redisClient.set(key, value);
            const deleteResult = await redisClient.del(key);
            expect(deleteResult).toBe(true);

            const getValue = await redisClient.get(key);
            expect(getValue).toBeNull();
        });

        it('should check if key exists', async () => {
            const key = 'test:exists';
            const value = 'exists';

            // Key should not exist initially
            const existsBefore = await redisClient.exists(key);
            expect(existsBefore).toBe(false);

            // Set key and check existence
            await redisClient.set(key, value);
            const existsAfter = await redisClient.exists(key);
            expect(existsAfter).toBe(true);
        });

        it('should increment numeric values', async () => {
            const key = 'test:counter';

            const count1 = await redisClient.incr(key);
            expect(count1).toBe(1);

            const count2 = await redisClient.incr(key);
            expect(count2).toBe(2);

            const count3 = await redisClient.incrby(key, 5);
            expect(count3).toBe(7);
        });
    });

    describe('Hash Operations', () => {
        beforeEach(() => {
            redisClient = new RedisClient(config);
        });

        it('should set and get hash fields', async () => {
            const key = 'test:hash';
            const field = 'name';
            const value = 'John Doe';

            await redisClient.hset(key, field, value);
            const getValue = await redisClient.hget(key, field);
            expect(getValue).toBe(value);
        });

        it('should get all hash fields', async () => {
            const key = 'test:hash:all';

            await redisClient.hset(key, 'name', 'Jane Doe');
            await redisClient.hset(key, 'age', '30');
            await redisClient.hset(key, 'city', 'New York');

            const allFields = await redisClient.hgetall(key);
            expect(allFields).toEqual({
                name: 'Jane Doe',
                age: '30',
                city: 'New York',
            });
        });
    });

    describe('List Operations', () => {
        beforeEach(() => {
            redisClient = new RedisClient(config);
        });

        it('should push and pop from lists', async () => {
            const key = 'test:list';

            await redisClient.lpush(key, 'first', 'second', 'third');

            const item = await redisClient.rpop(key);
            expect(item).toBe('first');

            const range = await redisClient.lrange(key, 0, -1);
            expect(range).toEqual(['third', 'second']);
        });
    });

    describe('Set Operations', () => {
        beforeEach(() => {
            redisClient = new RedisClient(config);
        });

        it('should add and check set members', async () => {
            const key = 'test:set';

            await redisClient.sadd(key, 'apple', 'banana', 'cherry');

            const isMember = await redisClient.sismember(key, 'banana');
            expect(isMember).toBe(true);

            const notMember = await redisClient.sismember(key, 'grape');
            expect(notMember).toBe(false);

            const members = await redisClient.smembers(key);
            expect(members).toContain('apple');
            expect(members).toContain('banana');
            expect(members).toContain('cherry');
            expect(members).toHaveLength(3);
        });
    });

    describe('Pattern Deletion', () => {
        beforeEach(() => {
            redisClient = new RedisClient(config);
        });

        it('should delete keys matching pattern', async () => {
            const prefix = 'test:pattern:';

            // Set multiple keys with same pattern
            await redisClient.set(`${prefix}1`, 'value1');
            await redisClient.set(`${prefix}2`, 'value2');
            await redisClient.set(`${prefix}3`, 'value3');
            await redisClient.set('test:other', 'other');

            // Delete keys matching pattern
            const deletedCount = await redisClient.delPattern(`${prefix}*`);
            expect(deletedCount).toBe(3);

            // Check that pattern keys are deleted
            const value1 = await redisClient.get(`${prefix}1`);
            expect(value1).toBeNull();

            // Check that other key still exists
            const otherValue = await redisClient.get('test:other');
            expect(otherValue).toBe('other');
        });
    });

    describe('Error Handling', () => {
        it('should handle connection errors gracefully', async () => {
            const badConfig: CacheConfig = {
                host: 'nonexistent-host',
                port: 9999,
                lazyConnect: true,
                maxRetriesPerRequest: 1,
            };

            redisClient = new RedisClient(badConfig);

            // Operations should return null/false on connection error
            const getValue = await redisClient.get('test:key');
            expect(getValue).toBeNull();

            const setResult = await redisClient.set('test:key', 'value');
            expect(setResult).toBe(false);
        });
    });

    describe('Health Check', () => {
        beforeEach(() => {
            redisClient = new RedisClient(config);
        });

        it('should ping Redis successfully', async () => {
            const pingResult = await redisClient.ping();
            expect(pingResult).toBe(true);
        });
    });

    describe('Pub/Sub Operations', () => {
        beforeEach(() => {
            redisClient = new RedisClient(config);
        });

        it('should publish messages', async () => {
            const channel = 'test:channel';
            const message = 'Hello, subscribers!';

            const subscriberCount = await redisClient.publish(channel, message);
            expect(subscriberCount).toBeGreaterThanOrEqual(0);
        });
    });
});