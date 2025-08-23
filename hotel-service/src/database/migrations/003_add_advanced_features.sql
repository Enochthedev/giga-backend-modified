-- Advanced hotel service features

-- Room blocks table for tracking blocked dates
CREATE TABLE room_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pricing rules table for dynamic pricing
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('seasonal', 'demand', 'event', 'day_of_week', 'advance_booking')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_of_week INTEGER[], -- Array of day numbers (0=Sunday, 1=Monday, etc.)
    price_modifier DECIMAL(10, 2) NOT NULL,
    modifier_type VARCHAR(20) NOT NULL CHECK (modifier_type IN ('percentage', 'fixed')),
    minimum_stay INTEGER DEFAULT 1,
    conditions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pricing optimizations log
CREATE TABLE pricing_optimizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    applied_count INTEGER DEFAULT 0,
    revenue_difference DECIMAL(10, 2) DEFAULT 0.00,
    optimization_type VARCHAR(50) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Property searches log for demand tracking
CREATE TABLE property_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id),
    property_id UUID REFERENCES properties(id),
    search_criteria JSONB,
    user_id VARCHAR(255),
    search_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    result_count INTEGER DEFAULT 0
);

-- Search suggestions cache
CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_text VARCHAR(255) NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('city', 'property', 'landmark')),
    suggestion_value VARCHAR(500) NOT NULL,
    result_count INTEGER DEFAULT 0,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_room_blocks_room_id ON room_blocks(room_id);
CREATE INDEX idx_room_blocks_dates ON room_blocks(start_date, end_date);

CREATE INDEX idx_pricing_rules_room_id ON pricing_rules(room_id);
CREATE INDEX idx_pricing_rules_dates ON pricing_rules(start_date, end_date);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX idx_pricing_rules_priority ON pricing_rules(priority);

CREATE INDEX idx_pricing_optimizations_room_id ON pricing_optimizations(room_id);
CREATE INDEX idx_pricing_optimizations_dates ON pricing_optimizations(start_date, end_date);

CREATE INDEX idx_property_searches_room_id ON property_searches(room_id);
CREATE INDEX idx_property_searches_property_id ON property_searches(property_id);
CREATE INDEX idx_property_searches_date ON property_searches(search_date);
CREATE INDEX idx_property_searches_user_id ON property_searches(user_id);

CREATE INDEX idx_search_suggestions_query ON search_suggestions(query_text);
CREATE INDEX idx_search_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX idx_search_suggestions_popularity ON search_suggestions(popularity_score DESC);

-- Update triggers
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_search_suggestions_updated_at BEFORE UPDATE ON search_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();