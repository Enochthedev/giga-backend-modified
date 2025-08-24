-- Create vendor management tables

-- Vendors table (extends user information from auth service)
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- References user from auth service
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100), -- 'individual', 'company', 'partnership'
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    
    -- Contact information
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Business address
    business_address JSONB NOT NULL,
    
    -- Banking information for payouts
    bank_account_info JSONB, -- Encrypted banking details
    
    -- Vendor status and verification
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'suspended', 'rejected'
    verification_status VARCHAR(50) DEFAULT 'unverified', -- 'unverified', 'pending', 'verified', 'rejected'
    verification_documents JSONB DEFAULT '[]'::jsonb, -- Array of document URLs
    
    -- Business metrics
    total_sales DECIMAL(12,2) DEFAULT 0 CHECK (total_sales >= 0),
    total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
    average_rating DECIMAL(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
    total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
    
    -- Commission and fees
    commission_rate DECIMAL(5,4) DEFAULT 0.10 CHECK (commission_rate >= 0 AND commission_rate <= 1), -- 10% default
    
    -- Settings and preferences
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendor categories (what types of products they can sell)
CREATE TABLE IF NOT EXISTS vendor_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID, -- Admin user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, category_id)
);

-- Product approval workflow
CREATE TABLE IF NOT EXISTS product_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'changes_requested'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID, -- Admin user ID
    rejection_reason TEXT,
    admin_notes TEXT,
    changes_requested TEXT,
    
    -- Product data at time of submission (for audit)
    product_data JSONB NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendor payouts
CREATE TABLE IF NOT EXISTS vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    payout_period_start DATE NOT NULL,
    payout_period_end DATE NOT NULL,
    
    -- Financial details
    gross_sales DECIMAL(12,2) NOT NULL CHECK (gross_sales >= 0),
    commission_amount DECIMAL(12,2) NOT NULL CHECK (commission_amount >= 0),
    net_amount DECIMAL(12,2) NOT NULL CHECK (net_amount >= 0),
    
    -- Order details
    total_orders INTEGER NOT NULL CHECK (total_orders >= 0),
    order_ids UUID[] DEFAULT '{}', -- Array of order IDs included in this payout
    
    -- Payout status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    notes TEXT,
    processed_by UUID, -- Admin user ID
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendor analytics (daily aggregates)
CREATE TABLE IF NOT EXISTS vendor_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Sales metrics
    total_sales DECIMAL(12,2) DEFAULT 0 CHECK (total_sales >= 0),
    total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
    total_items_sold INTEGER DEFAULT 0 CHECK (total_items_sold >= 0),
    
    -- Product metrics
    total_products INTEGER DEFAULT 0 CHECK (total_products >= 0),
    active_products INTEGER DEFAULT 0 CHECK (active_products >= 0),
    
    -- Customer metrics
    unique_customers INTEGER DEFAULT 0 CHECK (unique_customers >= 0),
    new_customers INTEGER DEFAULT 0 CHECK (new_customers >= 0),
    
    -- Review metrics
    new_reviews INTEGER DEFAULT 0 CHECK (new_reviews >= 0),
    average_rating DECIMAL(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, date)
);

-- Vendor notifications
CREATE TABLE IF NOT EXISTS vendor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- 'order_received', 'product_approved', 'payout_processed', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Additional notification data
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for vendor tables
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_verification_status ON vendors(verification_status);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at);

CREATE INDEX IF NOT EXISTS idx_vendor_categories_vendor_id ON vendor_categories(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_category_id ON vendor_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_vendor_categories_is_approved ON vendor_categories(is_approved);

CREATE INDEX IF NOT EXISTS idx_product_approvals_product_id ON product_approvals(product_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_vendor_id ON product_approvals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_status ON product_approvals(status);
CREATE INDEX IF NOT EXISTS idx_product_approvals_submitted_at ON product_approvals(submitted_at);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor_id ON vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_payout_period_start ON vendor_payouts(payout_period_start);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_payout_period_end ON vendor_payouts(payout_period_end);

CREATE INDEX IF NOT EXISTS idx_vendor_analytics_vendor_id ON vendor_analytics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_analytics_date ON vendor_analytics(date);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor_id ON vendor_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_is_read ON vendor_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_created_at ON vendor_notifications(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_approvals_updated_at BEFORE UPDATE ON product_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_payouts_updated_at BEFORE UPDATE ON vendor_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_analytics_updated_at BEFORE UPDATE ON vendor_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();