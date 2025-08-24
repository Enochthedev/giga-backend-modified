import { EcommerceDatabase } from '../database/connection';

// Test database configuration
const testConfig = {
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/ecommerce_test',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

beforeAll(async () => {
    // Initialize test database
    await EcommerceDatabase.initialize(testConfig);
});

afterAll(async () => {
    // Close database connection
    await EcommerceDatabase.close();
});

beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
});

async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await EcommerceDatabase.query('DELETE FROM cart_items');
    await EcommerceDatabase.query('DELETE FROM shopping_carts');
    await EcommerceDatabase.query('DELETE FROM order_items');
    await EcommerceDatabase.query('DELETE FROM orders');
    await EcommerceDatabase.query('DELETE FROM product_reviews');
    await EcommerceDatabase.query('DELETE FROM wishlists');
    await EcommerceDatabase.query('DELETE FROM inventory');
    await EcommerceDatabase.query('DELETE FROM product_variants');
    await EcommerceDatabase.query('DELETE FROM products');
    await EcommerceDatabase.query('DELETE FROM categories');
}