-- ====================================================================
-- COLLEGE BUS LIVE TRACKER - SUPABASE POSTGRESQL SCHEMA
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- Optional for advanced spatial queries

-- 2. USER PROFILES & ROLES
CREATE TYPE user_role AS ENUM ('student', 'driver', 'admin');
CREATE TYPE bus_status AS ENUM ('IDLE', 'MOVING', 'STOPPED', 'OFFLINE');
CREATE TYPE trip_status AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    roll_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROUTES
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    start_point TEXT NOT NULL,
    end_point TEXT NOT NULL,
    distance_km NUMERIC(5, 2) DEFAULT 0.0,
    duration_mins INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    polyline JSONB DEFAULT '[]'::jsonb, -- Array of [latitude, longitude] pairs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STOPS
CREATE TABLE IF NOT EXISTS stops (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    scheduled_time TEXT NOT NULL,
    is_terminal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_route_sequence UNIQUE (route_id, sequence_order)
);

-- 5. DRIVERS
CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    pin TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BUSES
CREATE TABLE IF NOT EXISTS buses (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    plate_number TEXT NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 45,
    assigned_route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
    assigned_driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
    status bus_status DEFAULT 'IDLE',
    current_trip_id TEXT,
    last_known_latitude DOUBLE PRECISION,
    last_known_longitude DOUBLE PRECISION,
    last_known_speed_kmh NUMERIC(5, 1) DEFAULT 0,
    last_known_heading NUMERIC(5, 1) DEFAULT 0,
    last_known_accuracy_meters NUMERIC(5, 1) DEFAULT 5,
    last_location_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRIPS
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
    status trip_status DEFAULT 'SCHEDULED',
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    current_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
    next_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
    eta_to_next_stop_mins INTEGER,
    delay_mins INTEGER DEFAULT 0,
    speed_kmh NUMERIC(5, 1) DEFAULT 0,
    heading NUMERIC(5, 1) DEFAULT 0,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LIVE LOCATION BREADCRUMBS
CREATE TABLE IF NOT EXISTS live_locations (
    id BIGSERIAL PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh NUMERIC(5, 1) DEFAULT 0,
    heading NUMERIC(5, 1) DEFAULT 0,
    accuracy_meters NUMERIC(5, 1) DEFAULT 5,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_locations_trip_time ON live_locations(trip_id, recorded_at DESC);

-- 9. STUDENT ROUTE SELECTIONS & ACTIVITY
CREATE TABLE IF NOT EXISTS student_activity (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    phone TEXT,
    route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    preferred_stop_id TEXT REFERENCES stops(id) ON DELETE SET NULL,
    is_tracking BOOLEAN DEFAULT TRUE,
    is_waiting BOOLEAN DEFAULT FALSE,
    is_boarded BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SUPABASE REALTIME ENABLEMENT
ALTER PUBLICATION supabase_realtime ADD TABLE buses;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE student_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public/Student read-only policies
CREATE POLICY "Anyone can view routes" ON routes FOR SELECT USING (true);
CREATE POLICY "Anyone can view stops" ON stops FOR SELECT USING (true);
CREATE POLICY "Anyone can view buses" ON buses FOR SELECT USING (true);
CREATE POLICY "Anyone can view trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Anyone can view notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can view student activity stats" ON student_activity FOR SELECT USING (true);

-- Student self updates
CREATE POLICY "Students can update their own activity" ON student_activity 
FOR ALL USING (true) WITH CHECK (true);

-- Drivers can update their active trips and bus location
CREATE POLICY "Drivers can update trips" ON trips 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Drivers can update bus location" ON buses 
FOR UPDATE USING (true) WITH CHECK (true);

-- Admin full control
CREATE POLICY "Admin full routes access" ON routes FOR ALL USING (true);
CREATE POLICY "Admin full stops access" ON stops FOR ALL USING (true);
CREATE POLICY "Admin full buses access" ON buses FOR ALL USING (true);

-- ====================================================================
-- INITIAL SEED DATA FOR ROUTE 01
-- ====================================================================
INSERT INTO routes (id, name, code, description, start_point, end_point, distance_km, duration_mins)
VALUES (
    'ROUTE-01',
    'Route 01: Saket → Delhi Technical Campus',
    'R01',
    'Saket, Delhi to Delhi Technical Campus, Greater Noida (Noida Side)',
    'Saket, Delhi',
    'Delhi Technical Campus, Greater Noida',
    54.1,
    65
) ON CONFLICT (id) DO NOTHING;

INSERT INTO stops (id, route_id, sequence_order, name, description, latitude, longitude, scheduled_time, is_terminal)
VALUES 
    ('STOP-01', 'ROUTE-01', 1, 'Saket (Starting Point)', 'Saket Metro / Press Enclave Rd', 28.5204, 77.2014, '07:30 AM', false),
    ('STOP-02', 'ROUTE-01', 2, 'Stop 02 (Placeholder)', 'Near Kalindi Kunj / Sarita Vihar transit', 28.5447, 77.2648, '07:50 AM', false),
    ('STOP-03', 'ROUTE-01', 3, 'Stop 03 (Placeholder)', 'Near Mahamaya Flyover / Sector 18 entry', 28.5583, 77.3352, '08:05 AM', false),
    ('STOP-04', 'ROUTE-01', 4, 'Stop 04 (Placeholder)', 'Noida Expressway (near Sector 128 / 137)', 28.5132, 77.3821, '08:25 AM', false),
    ('STOP-05', 'ROUTE-01', 5, 'Stop 05 (Placeholder)', 'Pari Chowk Interchange, Greater Noida', 28.4735, 77.4789, '08:45 AM', false),
    ('STOP-06', 'ROUTE-01', 6, 'Delhi Technical Campus (Destination)', 'Knowledge Park III, Greater Noida', 28.4633, 77.4912, '09:00 AM', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (id, name, phone, pin)
VALUES ('DRV-01', 'Rajesh Kumar', '+91 98112 34567', '1234')
ON CONFLICT (id) DO NOTHING;

INSERT INTO buses (id, number, plate_number, capacity, assigned_route_id, assigned_driver_id, status)
VALUES ('BUS-01', 'Bus 01', 'DL 1P B 4022', 45, 'ROUTE-01', 'DRV-01', 'IDLE')
ON CONFLICT (id) DO NOTHING;
