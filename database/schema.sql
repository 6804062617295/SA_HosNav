-- Hospital Queue and Navigation Prototype Schema

-- ENUMS
CREATE TYPE user_role AS ENUM ('PATIENT', 'STAFF', 'ADMIN');
CREATE TYPE queue_status AS ENUM ('Waiting', 'Called', 'Processing', 'Completed', 'Skipped');

-- 1. Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'PATIENT' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Locations Table
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    building VARCHAR(100) NOT NULL,
    floor INTEGER NOT NULL
);

-- 3. Queues Table
CREATE TABLE queues (
    queue_id SERIAL PRIMARY KEY,
    queue_number VARCHAR(50) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL, -- Used for Queue QR single-use link
    patient_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Nullable for Guest scans
    destination_id INTEGER REFERENCES locations(location_id) ON DELETE RESTRICT,
    status queue_status DEFAULT 'Waiting' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Queue History Table
CREATE TABLE queue_history (
    history_id SERIAL PRIMARY KEY,
    queue_id INTEGER NOT NULL REFERENCES queues(queue_id) ON DELETE CASCADE,
    status queue_status NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    staff_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);

-- 5. Navigation Nodes Table
CREATE TABLE navigation_nodes (
    node_id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(location_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'hallway', 'intersection', 'room', 'entrance'
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    floor INTEGER DEFAULT 1
);

-- 6. Navigation Edges Table
CREATE TABLE navigation_edges (
    edge_id SERIAL PRIMARY KEY,
    from_node INTEGER NOT NULL REFERENCES navigation_nodes(node_id) ON DELETE CASCADE,
    to_node INTEGER NOT NULL REFERENCES navigation_nodes(node_id) ON DELETE CASCADE,
    instruction TEXT NOT NULL,
    distance_meters DECIMAL(5,2) DEFAULT 0.0
);

-- 7. QR Checkpoints Table
CREATE TABLE qr_checkpoints (
    qr_id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL UNIQUE REFERENCES navigation_nodes(node_id) ON DELETE CASCADE,
    code_hash VARCHAR(255) UNIQUE NOT NULL -- The physical QR code content mapping to this checkpoint
);
