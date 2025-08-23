#!/usr/bin/env ts-node

import { db } from '../database/connection';

async function healthCheck() {
    try {
        console.log('🔍 Checking database connection...');

        const isHealthy = await db.healthCheck();

        if (isHealthy) {
            console.log('✅ Database connection is healthy');

            // Check if tables exist
            const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('campaigns', 'advertisements', 'ad_groups', 'advertisers')
        ORDER BY table_name;
      `;

            const result = await db.query(tablesQuery);
            const tables = result.rows.map((row: any) => row.table_name);

            console.log('📊 Found tables:', tables);

            if (tables.length >= 4) {
                console.log('✅ All core tables are present');
            } else {
                console.log('⚠️  Some tables may be missing');
            }

            process.exit(0);
        } else {
            console.log('❌ Database connection failed');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Health check failed:', error);
        process.exit(1);
    }
}

// Run health check if this file is executed directly
if (require.main === module) {
    healthCheck();
}

export { healthCheck };