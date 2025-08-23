-- Add advanced ecommerce features

-- Order status history table for tracking order status changes
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    notify_customer BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for order status history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- Create trigger for order status history
CREATE TRIGGER update_order_status_history_updated_at BEFORE UPDATE ON order_status_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Review helpful table for tracking which users found reviews helpful
CREATE TABLE IF NOT EXISTS review_helpful (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References user from auth service
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, user_id)
);

-- Create indexes for review helpful
CREATE INDEX IF NOT EXISTS idx_review_helpful_review_id ON review_helpful(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_user_id ON review_helpful(user_id);

-- User behavior tracking table for recommendations
CREATE TABLE IF NOT EXISTS user_behavior_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References user from auth service
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'cart', 'purchase', 'wishlist', 'review')),
    weight DECIMAL(3,2) DEFAULT 1.0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, action)
);

-- Create indexes for user behavior tracking
CREATE INDEX IF NOT EXISTS idx_user_behavior_tracking_user_id ON user_behavior_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_tracking_product_id ON user_behavior_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_tracking_action ON user_behavior_tracking(action);
CREATE INDEX IF NOT EXISTS idx_user_behavior_tracking_timestamp ON user_behavior_tracking(timestamp);

-- Create trigger for user behavior tracking
CREATE TRIGGER update_user_behavior_tracking_updated_at BEFORE UPDATE ON user_behavior_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Checkout sessions table for advanced checkout flow
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL, -- References user from auth service
    cart_id UUID REFERENCES shopping_carts(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    shipping_address JSONB,
    billing_address JSONB,
    shipping_method JSONB,
    payment_method JSONB,
    pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
    available_shipping_methods JSONB DEFAULT '[]'::jsonb,
    available_payment_methods JSONB DEFAULT '[]'::jsonb,
    promo_codes JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for checkout sessions
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user_id ON checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires_at ON checkout_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_created_at ON checkout_sessions(created_at);

-- Create trigger for checkout sessions
CREATE TRIGGER update_checkout_sessions_updated_at BEFORE UPDATE ON checkout_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();