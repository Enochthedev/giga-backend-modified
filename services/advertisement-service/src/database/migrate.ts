#!/usr/bin/env ts-node

import { db } from './connection';

async function runMigrations() {
    try {
        console.log('Starting database migration...');

        // Initialize database schema
        await db.initializeDatabase();

        console.log('✅ Database migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database migration failed:', error);
        process.exit(1);
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}

export { runMigrations };