-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);

-- Drivers table
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  license_number TEXT
);

-- Rides table
CREATE TABLE rides (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES users(id),
  driver_id INTEGER REFERENCES drivers(id),
  status TEXT,
  fare NUMERIC
);
