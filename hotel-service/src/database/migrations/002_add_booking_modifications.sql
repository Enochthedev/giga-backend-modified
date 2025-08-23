-- Add booking modifications tracking table

CREATE TABLE booking_modifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    modification_type VARCHAR(50) NOT NULL CHECK (modification_type IN ('modification', 'cancellation')),
    old_values JSONB,
    new_values JSONB,
    modification_fee DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_booking_modifications_booking_id ON booking_modifications(booking_id);
CREATE INDEX idx_booking_modifications_user_id ON booking_modifications(user_id);
CREATE INDEX idx_booking_modifications_type ON booking_modifications(modification_type);
CREATE INDEX idx_booking_modifications_created_at ON booking_modifications(created_at);