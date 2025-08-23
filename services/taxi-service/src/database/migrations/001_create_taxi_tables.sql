-- Enable PostGIS extension for spatial data support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum types
CREATE TYPE driver_status AS ENUM ('offline', 'available', 'busy', 'on_ride');
CREATE TYPE vehicle_type AS ENUM ('regular', 'luxury', 'suv', 'motorcycle');
CREATE TYPE ride_status AS ENUM ('requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled');
CREATE TYPE ride_request_status AS ENUM ('pending', 'matched', 'expired', 'cancelled');

-- Create drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    license_number VARCHAR(20) UNIQUE NOT NULL,
    license_expiry_date DATE NOT NULL,
    status driver_status DEFAULT 'offline',
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_rides INTEGER DEFAULT 0 CHECK (total_rides >= 0),
    total_earnings DECIMAL(10,2) DEFAULT 0 CHECK (total_earnings >= 0),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    profile_image_url TEXT,
    documents JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    make VARCHAR(30) NOT NULL,
    model VARCHAR(30) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
    color VARCHAR(20) NOT NULL,
    license_plate VARCHAR(15) UNIQUE NOT NULL,
    vin VARCHAR(17) UNIQUE NOT NULL,
    type vehicle_type DEFAULT 'regular',
    capacity INTEGER DEFAULT 4 CHECK (capacity >= 1 AND capacity <= 8),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    insurance_expiry_date DATE NOT NULL,
    registration_expiry_date DATE NOT NULL,
    documents JSONB,
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create driver_locations table for real-time location tracking
CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    heading DECIMAL(5,2) CHECK (heading >= 0 AND heading <= 360),
    speed DECIMAL(5,2) CHECK (speed >= 0),
    accuracy DECIMAL(5,2) CHECK (accuracy >= 0),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ride_requests table
CREATE TABLE ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(255) NOT NULL,
    status ride_request_status DEFAULT 'pending',
    vehicle_type vehicle_type DEFAULT 'regular',
    pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_address TEXT NOT NULL,
    estimated_fare DECIMAL(10,2) NOT NULL CHECK (estimated_fare >= 0),
    estimated_distance INTEGER NOT NULL CHECK (estimated_distance >= 0),
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration >= 0),
    search_radius INTEGER DEFAULT 10 CHECK (search_radius >= 1 AND search_radius <= 60),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_notes TEXT,
    preferences JSONB,
    matched_drivers TEXT[],
    matched_ride_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rides table
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(255) NOT NULL,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    status ride_status DEFAULT 'requested',
    vehicle_type vehicle_type DEFAULT 'regular',
    pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_address TEXT NOT NULL,
    estimated_fare DECIMAL(10,2) NOT NULL CHECK (estimated_fare >= 0),
    final_fare DECIMAL(10,2) CHECK (final_fare >= 0),
    estimated_distance INTEGER NOT NULL CHECK (estimated_distance >= 0),
    actual_distance INTEGER CHECK (actual_distance >= 0),
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration >= 0),
    actual_duration INTEGER CHECK (actual_duration >= 0),
    driver_arrival_time INTEGER CHECK (driver_arrival_time >= 0),
    accepted_at TIMESTAMP WITH TIME ZONE,
    driver_arrived_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    customer_notes TEXT,
    driver_notes TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    customer_review TEXT,
    driver_review TEXT,
    route JSONB,
    payment_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance

-- Driver indexes
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_is_active ON drivers(is_active);
CREATE INDEX idx_drivers_is_verified ON drivers(is_verified);
CREATE INDEX idx_drivers_email ON drivers(email);

-- Vehicle indexes
CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_is_active ON vehicles(is_active);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);

-- Driver location indexes
CREATE INDEX idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX idx_driver_locations_updated_at ON driver_locations(updated_at);
CREATE INDEX idx_driver_locations_location ON driver_locations USING GIST(location);

-- Ride request indexes
CREATE INDEX idx_ride_requests_customer_id ON ride_requests(customer_id);
CREATE INDEX idx_ride_requests_status ON ride_requests(status);
CREATE INDEX idx_ride_requests_created_at ON ride_requests(created_at);
CREATE INDEX idx_ride_requests_expires_at ON ride_requests(expires_at);
CREATE INDEX idx_ride_requests_pickup_location ON ride_requests USING GIST(pickup_location);

-- Ride indexes
CREATE INDEX idx_rides_customer_id ON rides(customer_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created_at ON rides(created_at);
CREATE INDEX idx_rides_completed_at ON rides(completed_at);

-- Create unique constraint for one vehicle per driver
CREATE UNIQUE INDEX idx_vehicles_one_per_driver ON vehicles(driver_id) WHERE is_active = true;

-- Create unique constraint for one location per driver
CREATE UNIQUE INDEX idx_driver_locations_one_per_driver ON driver_locations(driver_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_locations_updated_at BEFORE UPDATE ON driver_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_requests_updated_at BEFORE UPDATE ON ride_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to find nearby drivers
CREATE OR REPLACE FUNCTION find_nearby_drivers(
    pickup_lat DOUBLE PRECISION,
    pickup_lon DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 10,
    vehicle_type_filter vehicle_type DEFAULT NULL,
    max_results INTEGER DEFAULT 10
) RETURNS TABLE (
    driver_id UUID,
    distance_meters DOUBLE PRECISION,
    driver_name TEXT,
    vehicle_info JSONB,
    rating DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        ST_Distance(
            dl.location,
            ST_SetSRID(ST_MakePoint(pickup_lon, pickup_lat), 4326)::geography
        ) as distance_meters,
        CONCAT(d.first_name, ' ', d.last_name) as driver_name,
        jsonb_build_object(
            'make', v.make,
            'model', v.model,
            'year', v.year,
            'color', v.color,
            'type', v.type,
            'licensePlate', v.license_plate
        ) as vehicle_info,
        d.rating
    FROM drivers d
    JOIN vehicles v ON d.id = v.driver_id
    JOIN driver_locations dl ON d.id = dl.driver_id
    WHERE 
        d.status = 'available'
        AND d.is_active = true
        AND d.is_verified = true
        AND v.is_active = true
        AND v.is_verified = true
        AND (vehicle_type_filter IS NULL OR v.type = vehicle_type_filter)
        AND dl.updated_at > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
        AND ST_DWithin(
            dl.location,
            ST_SetSRID(ST_MakePoint(pickup_lon, pickup_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance_meters
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;