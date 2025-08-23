#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { connectDatabase } from './connection';
import { runMigrations } from './migrate';

dotenv.config();

async function main() {
    try {
        console.log('Connecting to database...');
        await connectDatabase();

        console.log('Running migrations...');
        await runMigrations();

        console.log('Migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();