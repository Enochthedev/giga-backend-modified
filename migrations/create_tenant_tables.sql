-- Migration: Create tenant management tables
-- Description: Creates tables for multi-tenant architecture support

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    subdomain VARCHAR(100),
    region VARCHAR(10) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for tenants table
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_region ON tenants(region);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Create unique constraints
ALTER TABLE tenants ADD CONSTRAINT unique_tenant_domain UNIQUE(domain);
ALTER TABLE tenants ADD CONSTRAINT unique_tenant_subdomain UNIQUE(subdomain);

-- Create localized_content table
CREATE TABLE IF NOT EXISTS localized_content (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    region VARCHAR(10),
    content JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    cultural_adaptations JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for localized_content table
CREATE INDEX IF NOT EXISTS idx_content_tenant ON localized_content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_locale ON localized_content(locale);
CREATE INDEX IF NOT EXISTS idx_content_region ON localized_content(region);
CREATE INDEX IF NOT EXISTS idx_content_category ON localized_content(category);
CREATE INDEX IF NOT EXISTS idx_content_type ON localized_content(type);
CREATE INDEX IF NOT EXISTS idx_content_status ON localized_content(status);

-- Create content_templates table
CREATE TABLE IF NOT EXISTS content_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    structure JSONB NOT NULL DEFAULT '[]',
    localization_rules JSONB NOT NULL DEFAULT '[]',
    cultural_rules JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for content_templates table
CREATE INDEX IF NOT EXISTS idx_templates_category ON content_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON content_templates(name);

-- Create currency_rates table
CREATE TABLE IF NOT EXISTS currency_rates (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,8) NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for currency_rates table
CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON currency_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_currency_rates_timestamp ON currency_rates(timestamp);

-- Create unique constraint for currency pair at specific time
CREATE UNIQUE INDEX IF NOT EXISTS unique_currency_rate_time 
ON currency_rates(from_currency, to_currency, DATE_TRUNC('minute', timestamp));

-- Create region_configs table
CREATE TABLE IF NOT EXISTS region_configs (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    continent VARCHAR(50) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for region_configs table
CREATE INDEX IF NOT EXISTS idx_region_continent ON region_configs(continent);
CREATE INDEX IF NOT EXISTS idx_region_currency ON region_configs(currency);

-- Create tenant_analytics table for tracking tenant usage
CREATE TABLE IF NOT EXISTS tenant_analytics (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    dimensions JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for tenant_analytics table
CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON tenant_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metric ON tenant_analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON tenant_analytics(timestamp);

-- Create tenant_settings table for dynamic configuration
CREATE TABLE IF NOT EXISTS tenant_settings (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) NOT NULL DEFAULT 'string',
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for tenant_settings table
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON tenant_settings(setting_key);
CREATE UNIQUE INDEX IF NOT EXISTS unique_tenant_setting ON tenant_settings(tenant_id, setting_key);

-- Create translation_keys table for i18n management
CREATE TABLE IF NOT EXISTS translation_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(500) NOT NULL,
    namespace VARCHAR(100) DEFAULT 'common',
    default_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for translation_keys table
CREATE INDEX IF NOT EXISTS idx_translation_key ON translation_keys(key_name);
CREATE INDEX IF NOT EXISTS idx_translation_namespace ON translation_keys(namespace);
CREATE UNIQUE INDEX IF NOT EXISTS unique_translation_key ON translation_keys(key_name, namespace);

-- Create translations table for storing actual translations
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    translation_key_id INTEGER REFERENCES translation_keys(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    translated_value TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for translations table
CREATE INDEX IF NOT EXISTS idx_translations_tenant ON translations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(translation_key_id);
CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale);
CREATE UNIQUE INDEX IF NOT EXISTS unique_translation ON translations(tenant_id, translation_key_id, locale);

-- Create audit_logs table for tenant activity tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- Insert default region configurations
INSERT INTO region_configs (code, name, continent, timezone, currency, locale, config) VALUES
('US', 'United States', 'North America', 'America/New_York', 'USD', 'en-US', '{
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "h:mm A",
    "weekStart": 0,
    "businessDays": [1,2,3,4,5],
    "businessHours": {"start": "09:00", "end": "17:00"},
    "phoneFormat": "+1 (XXX) XXX-XXXX",
    "addressFormat": {
        "fields": [
            {"name": "street", "label": "Street Address", "required": true, "type": "text"},
            {"name": "city", "label": "City", "required": true, "type": "text"},
            {"name": "state", "label": "State", "required": true, "type": "select"},
            {"name": "zipCode", "label": "ZIP Code", "required": true, "type": "text"}
        ],
        "format": "{street}\\n{city}, {state} {zipCode}",
        "postalCodeRegex": "^\\\\d{5}(-\\\\d{4})?$"
    },
    "taxSettings": {
        "enabled": true,
        "type": "sales_tax",
        "rate": 8.5,
        "inclusive": false,
        "taxIdRequired": false,
        "exemptions": ["food", "medicine"]
    },
    "compliance": {
        "gdpr": false,
        "ccpa": true,
        "dataRetention": {"user": 2555, "transaction": 2555, "logs": 90},
        "cookieConsent": true,
        "ageVerification": {"required": true, "minimumAge": 13}
    },
    "cultural": {
        "rtl": false,
        "colorPreferences": {
            "primary": "#007bff",
            "secondary": "#6c757d",
            "success": "#28a745",
            "warning": "#ffc107",
            "danger": "#dc3545"
        },
        "communication": {
            "formalityLevel": "informal",
            "greetingStyle": "Hi there!",
            "contactPreferences": ["email", "phone", "chat"]
        }
    }
}'),
('NG', 'Nigeria', 'Africa', 'Africa/Lagos', 'NGN', 'en-NG', '{
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "HH:mm",
    "weekStart": 1,
    "businessDays": [1,2,3,4,5],
    "businessHours": {"start": "08:00", "end": "17:00"},
    "phoneFormat": "+234 XXX XXX XXXX",
    "addressFormat": {
        "fields": [
            {"name": "street", "label": "Street Address", "required": true, "type": "text"},
            {"name": "city", "label": "City", "required": true, "type": "text"},
            {"name": "state", "label": "State", "required": true, "type": "select"},
            {"name": "postalCode", "label": "Postal Code", "required": false, "type": "text"}
        ],
        "format": "{street}\\n{city}, {state}\\n{postalCode}",
        "postalCodeRegex": "^\\\\d{6}$"
    },
    "taxSettings": {
        "enabled": true,
        "type": "vat",
        "rate": 7.5,
        "inclusive": true,
        "taxIdRequired": true,
        "exemptions": ["basic_food", "medicine", "education"]
    },
    "compliance": {
        "gdpr": false,
        "ccpa": false,
        "dataRetention": {"user": 1825, "transaction": 2555, "logs": 365},
        "cookieConsent": false,
        "ageVerification": {"required": true, "minimumAge": 18}
    },
    "cultural": {
        "rtl": false,
        "colorPreferences": {
            "primary": "#008751",
            "secondary": "#ffffff",
            "success": "#28a745",
            "warning": "#ffc107",
            "danger": "#dc3545"
        },
        "communication": {
            "formalityLevel": "formal",
            "greetingStyle": "Good day!",
            "contactPreferences": ["phone", "whatsapp", "email"]
        }
    }
}')
ON CONFLICT (code) DO NOTHING;

-- Insert some default translation keys
INSERT INTO translation_keys (key_name, namespace, default_value, description) VALUES
('common.welcome', 'common', 'Welcome', 'Welcome message'),
('common.login', 'common', 'Login', 'Login button text'),
('common.logout', 'common', 'Logout', 'Logout button text'),
('common.save', 'common', 'Save', 'Save button text'),
('common.cancel', 'common', 'Cancel', 'Cancel button text'),
('common.delete', 'common', 'Delete', 'Delete button text'),
('common.edit', 'common', 'Edit', 'Edit button text'),
('common.create', 'common', 'Create', 'Create button text'),
('common.search', 'common', 'Search', 'Search placeholder text'),
('common.loading', 'common', 'Loading...', 'Loading message'),
('errors.required_field', 'validation', 'This field is required', 'Required field validation message'),
('errors.invalid_email', 'validation', 'Please enter a valid email address', 'Email validation message'),
('errors.password_too_short', 'validation', 'Password must be at least 8 characters', 'Password length validation'),
('ecommerce.add_to_cart', 'ecommerce', 'Add to Cart', 'Add to cart button'),
('ecommerce.checkout', 'ecommerce', 'Checkout', 'Checkout button'),
('taxi.book_ride', 'taxi', 'Book Ride', 'Book ride button'),
('hotel.book_now', 'hotel', 'Book Now', 'Hotel booking button')
ON CONFLICT (key_name, namespace) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON localized_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON region_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_keys_updated_at BEFORE UPDATE ON translation_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();