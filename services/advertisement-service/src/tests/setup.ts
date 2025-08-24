import { db } from '../database/connection';

beforeAll(async () => {
    // Initialize test database
    await db.initializeDatabase();
});

afterAll(async () => {
    // Clean up database connections
    await db.close();
});

beforeEach(async () => {
    // Clean up test data before each test
    await db.query('TRUNCATE TABLE ad_events, campaign_spending, ad_transactions, targeting_criteria, advertisements, ad_groups, campaigns, advertisers RESTART IDENTITY CASCADE');
});

export const createTestAdvertiser = async (id: string = 'test-advertiser') => {
    const query = `
    INSERT INTO advertisers (id, company_name, contact_email, account_balance)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

    const result = await db.query(query, [
        id,
        'Test Company',
        'test@example.com',
        1000.00
    ]);

    return result.rows[0];
};

export const createTestCampaign = async (advertiserId: string = 'test-advertiser') => {
    const query = `
    INSERT INTO campaigns (name, advertiser_id, budget, start_date, objective)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

    const result = await db.query(query, [
        'Test Campaign',
        advertiserId,
        500.00,
        new Date(),
        'traffic'
    ]);

    return result.rows[0];
};

export const createTestAdGroup = async (campaignId: number) => {
    const query = `
    INSERT INTO ad_groups (campaign_id, name, bid_amount)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

    const result = await db.query(query, [
        campaignId,
        'Test Ad Group',
        1.50
    ]);

    return result.rows[0];
};

export const createTestAdvertisement = async (adGroupId: number) => {
    const query = `
    INSERT INTO advertisements (ad_group_id, title, landing_url, ad_type)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

    const result = await db.query(query, [
        adGroupId,
        'Test Advertisement',
        'https://example.com',
        'banner'
    ]);

    return result.rows[0];
};