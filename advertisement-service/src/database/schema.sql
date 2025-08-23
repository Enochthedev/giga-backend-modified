-- Advertisement Service Database Schema

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    advertiser_id VARCHAR(255) NOT NULL,
    budget DECIMAL(10,2) NOT NULL DEFAULT 0,
    daily_budget DECIMAL(10,2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    objective VARCHAR(100) NOT NULL CHECK (objective IN ('awareness', 'traffic', 'conversions', 'engagement')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad groups within campaigns
CREATE TABLE IF NOT EXISTS ad_groups (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual advertisements
CREATE TABLE IF NOT EXISTS advertisements (
    id SERIAL PRIMARY KEY,
    ad_group_id INTEGER NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    call_to_action VARCHAR(100),
    landing_url VARCHAR(500) NOT NULL,
    ad_type VARCHAR(50) NOT NULL DEFAULT 'banner' CHECK (ad_type IN ('banner', 'video', 'native', 'popup')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Targeting criteria
CREATE TABLE IF NOT EXISTS targeting_criteria (
    id SERIAL PRIMARY KEY,
    ad_group_id INTEGER NOT NULL REFERENCES ad_groups(id) ON DELETE CASCADE,
    criteria_type VARCHAR(50) NOT NULL CHECK (criteria_type IN ('age', 'gender', 'location', 'interests', 'device', 'platform')),
    criteria_value VARCHAR(255) NOT NULL,
    operator VARCHAR(20) NOT NULL DEFAULT 'equals' CHECK (operator IN ('equals', 'contains', 'in', 'between')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad impressions and clicks tracking
CREATE TABLE IF NOT EXISTS ad_events (
    id SERIAL PRIMARY KEY,
    advertisement_id INTEGER NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cost DECIMAL(10,4) DEFAULT 0
);

-- Campaign budgets and spending
CREATE TABLE IF NOT EXISTS campaign_spending (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, date)
);

-- Payment transactions for ad billing
CREATE TABLE IF NOT EXISTS ad_transactions (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    advertiser_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('charge', 'refund', 'credit')),
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Advertiser accounts
CREATE TABLE IF NOT EXISTS advertisers (
    id VARCHAR(255) PRIMARY KEY,
    company_name VARCHAR(255),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    billing_address TEXT,
    account_balance DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_approval')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser ON campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id ON ad_events(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_timestamp ON ad_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON ad_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_spending_campaign ON campaign_spending(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_spending_date ON campaign_spending(date);
CREATE INDEX IF NOT EXISTS idx_targeting_ad_group ON targeting_criteria(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_campaign ON ad_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_transactions_advertiser ON ad_transactions(advertiser_id);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_groups_updated_at BEFORE UPDATE ON ad_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON advertisements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_transactions_updated_at BEFORE UPDATE ON ad_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertisers_updated_at BEFORE UPDATE ON advertisers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();