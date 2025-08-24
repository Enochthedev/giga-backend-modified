import { pool } from '../database/connection';

// Test database setup
beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'hotel_service_test';

    // You might want to run migrations here for test database
    // await runMigrations();
});

afterAll(async () => {
    // Clean up database connections
    await pool.end();
});

// Helper function to clean database between tests
export const cleanDatabase = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Delete in reverse order of dependencies
        await client.query('DELETE FROM property_reviews');
        await client.query('DELETE FROM bookings');
        await client.query('DELETE FROM room_availability');
        await client.query('DELETE FROM rooms');
        await client.query('DELETE FROM properties');
        await client.query('DELETE FROM property_owners');

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Mock user for testing
export const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    roles: ['property_owner']
};

// Mock property data
export const mockPropertyData = {
    name: 'Test Hotel',
    description: 'A beautiful test hotel',
    propertyType: 'hotel' as const,
    addressLine1: '123 Test Street',
    city: 'Test City',
    country: 'Test Country',
    checkInTime: '15:00:00',
    checkOutTime: '11:00:00',
    amenities: ['wifi', 'parking', 'pool'],
    images: ['https://example.com/image1.jpg']
};

// Mock room data
export const mockRoomData = {
    roomType: 'Standard',
    name: 'Standard Room',
    description: 'A comfortable standard room',
    maxOccupancy: 2,
    bedType: 'Queen',
    bedCount: 1,
    basePrice: 100.00,
    currency: 'USD',
    amenities: ['wifi', 'tv', 'minibar'],
    images: ['https://example.com/room1.jpg']
};

// Mock booking data
export const mockBookingData = {
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '+1234567890',
    checkInDate: '2024-12-01',
    checkOutDate: '2024-12-03',
    adults: 2,
    children: 0,
    specialRequests: 'Late check-in please'
};