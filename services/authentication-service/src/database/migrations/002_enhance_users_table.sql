-- Enhance users table with consolidated giga_main functionality
-- This migration adds comprehensive user profile fields, OAuth integration, and verification features

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS other_names VARCHAR(100),
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS street VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS gender VARCHAR(50) CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say')),
ADD COLUMN IF NOT EXISTS weight INTEGER CHECK (weight > 0 AND weight < 1000),
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'prefer-not-to-say')),
ADD COLUMN IF NOT EXISTS age_group VARCHAR(20) CHECK (age_group IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
ADD COLUMN IF NOT EXISTS area_of_interest TEXT,
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50) CHECK (oauth_provider IN ('google', 'apple')),
ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ratings JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxi_profile_id UUID,
ADD COLUMN IF NOT EXISTS taxi_profile_type VARCHAR(50) DEFAULT 'TaxiCustomer' CHECK (taxi_profile_type IN ('TaxiDriver', 'TaxiCustomer')),
ADD COLUMN IF NOT EXISTS credit_card VARCHAR(255);

-- Make password_hash nullable for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Update phone column to be required and unique
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);

-- Rename is_verified to maintain backward compatibility but add new verification columns
UPDATE users SET is_email_verified = is_verified WHERE is_email_verified IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider_id ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_otp_expires ON users(otp_expires);
CREATE INDEX IF NOT EXISTS idx_users_taxi_profile ON users(taxi_profile_id);

-- Create compound index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth_lookup ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- Add constraints for OAuth users
ALTER TABLE users ADD CONSTRAINT check_oauth_or_password 
    CHECK (
        (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL) OR 
        (password_hash IS NOT NULL)
    );

-- Add constraint for username requirement
ALTER TABLE users ADD CONSTRAINT users_username_not_null CHECK (username IS NOT NULL);

-- Update existing users to have default values for new required fields
UPDATE users SET 
    username = LOWER(CONCAT(first_name, '_', EXTRACT(EPOCH FROM created_at)::INTEGER))
WHERE username IS NULL;

UPDATE users SET 
    country = 'Not specified',
    address = 'Not specified', 
    street = 'Not specified',
    city = 'Not specified',
    zip_code = '00000',
    gender = 'prefer-not-to-say',
    marital_status = 'prefer-not-to-say',
    age_group = '25-34',
    area_of_interest = 'General'
WHERE country IS NULL;

-- Make new required fields NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN country SET NOT NULL;
ALTER TABLE users ALTER COLUMN address SET NOT NULL;
ALTER TABLE users ALTER COLUMN street SET NOT NULL;
ALTER TABLE users ALTER COLUMN city SET NOT NULL;
ALTER TABLE users ALTER COLUMN zip_code SET NOT NULL;
ALTER TABLE users ALTER COLUMN gender SET NOT NULL;
ALTER TABLE users ALTER COLUMN marital_status SET NOT NULL;
ALTER TABLE users ALTER COLUMN age_group SET NOT NULL;
ALTER TABLE users ALTER COLUMN area_of_interest SET NOT NULL;

-- Create function to update average rating when ratings change
CREATE OR REPLACE FUNCTION update_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ratings IS NOT NULL AND NEW.ratings != OLD.ratings THEN
        NEW.average_rating = (
            SELECT COALESCE(AVG((value::text)::numeric), 0)
            FROM jsonb_array_elements(NEW.ratings) AS value
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic average rating calculation
CREATE TRIGGER update_users_average_rating 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_average_rating();

-- Add additional taxi-related roles if they don't exist
INSERT INTO roles (name, description) VALUES
    ('taxi_driver', 'Taxi driver with ride management access'),
    ('taxi_customer', 'Taxi customer with booking access')
ON CONFLICT (name) DO NOTHING;

-- Add taxi-related permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    ('rides.read', 'rides', 'read', 'Read ride information'),
    ('rides.write', 'rides', 'write', 'Create and update rides'),
    ('rides.delete', 'rides', 'delete', 'Cancel rides'),
    ('drivers.read', 'drivers', 'read', 'Read driver information'),
    ('drivers.write', 'drivers', 'write', 'Update driver information'),
    ('vehicles.read', 'vehicles', 'read', 'Read vehicle information'),
    ('vehicles.write', 'vehicles', 'write', 'Create and update vehicles')
ON CONFLICT (name) DO NOTHING;

-- Assign taxi permissions to taxi roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'taxi_driver' AND p.name IN ('rides.read', 'rides.write', 'drivers.read', 'drivers.write', 'vehicles.read', 'vehicles.write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'taxi_customer' AND p.name IN ('rides.read', 'rides.write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create view for user profiles with complete information
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.first_name,
    u.last_name,
    u.other_names,
    u.phone,
    u.country,
    u.address,
    u.street,
    u.city,
    u.zip_code,
    u.gender,
    u.weight,
    u.marital_status,
    u.age_group,
    u.area_of_interest,
    u.profile_picture,
    u.oauth_provider,
    u.is_active,
    u.is_email_verified,
    u.is_phone_verified,
    u.average_rating,
    u.taxi_profile_type,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.is_active = true
GROUP BY u.id;

-- Add comment to document the enhanced schema
COMMENT ON TABLE users IS 'Enhanced users table with comprehensive profile information, OAuth integration, and verification features consolidated from giga_main service';