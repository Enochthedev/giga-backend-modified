import { Pool } from 'pg';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface TestUser {
    id: string;
    email: string;
    password: string;
    role: string;
}

export interface TestContext {
    db: Pool;
    redis: Redis;
    cleanup: () => Promise<void>;
}

/**
 * Create a test database connection
 */
export async function createTestDb(): Promise<Pool> {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
    });

    await pool.query('SELECT 1'); // Test connection
    return pool;
}

/**
 * Create a test Redis connection
 */
export async function createTestRedis(): Promise<Redis> {
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping(); // Test connection
    return redis;
}

/**
 * Generate a test JWT token
 */
export function generateTestToken(payload: any, expiresIn = '1h'): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
}

/**
 * Create a test user
 */
export async function createTestUser(
    db: Pool,
    userData: Partial<TestUser> = {}
): Promise<TestUser> {
    const defaultUser = {
        id: `test-user-${Date.now()}-${Math.random()}`,
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'user',
        ...userData,
    };

    const hashedPassword = await bcrypt.hash(defaultUser.password, 4);

    await db.query(
        `INSERT INTO users (id, email, password_hash, role, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (email) DO NOTHING`,
        [defaultUser.id, defaultUser.email, hashedPassword, defaultUser.role]
    );

    return defaultUser;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(db: Pool, redis: Redis): Promise<void> {
    // Clean up database tables
    const tables = [
        'user_sessions',
        'user_devices',
        'audit_logs',
        'users',
        'products',
        'orders',
        'payments',
        'bookings',
        'rides',
        'advertisements',
        'notifications',
        'files',
    ];

    for (const table of tables) {
        try {
            await db.query(`DELETE FROM ${table} WHERE id LIKE 'test-%' OR email LIKE '%@example.com'`);
        } catch (error) {
            // Table might not exist, ignore
        }
    }

    // Clean up Redis test keys
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
    condition: () => Promise<boolean> | boolean,
    timeout = 5000,
    interval = 100
): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Mock HTTP request/response objects
 */
export function createMockReq(overrides: any = {}) {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides,
    };
}

export function createMockRes() {
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        cookie: jest.fn().mockReturnThis(),
        clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
}

/**
 * Create test context with cleanup
 */
export async function createTestContext(): Promise<TestContext> {
    const db = await createTestDb();
    const redis = await createTestRedis();

    const cleanup = async () => {
        await cleanupTestData(db, redis);
        await db.end();
        await redis.quit();
    };

    return { db, redis, cleanup };
}