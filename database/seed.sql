-- Mock Seed Data for Prototype

-- 1. Users (Pre-provisioned Staff and Admin)
-- Passwords should be hashed in a real backend, using 'hashed_password' as a mock.
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@hospital.local', '$2b$10$/x6HzZA7VvcZyw/n0GCWYOx3J8QbEAe2uiXqvXbtcvDo0aQO/Xaz.', 'System Administrator', 'ADMIN'),
('nurse.a@hospital.local', '$2b$10$/x6HzZA7VvcZyw/n0GCWYOx3J8QbEAe2uiXqvXbtcvDo0aQO/Xaz.', 'Nurse Alice', 'STAFF'),
('dr.somchai@hospital.local', '$2b$10$/x6HzZA7VvcZyw/n0GCWYOx3J8QbEAe2uiXqvXbtcvDo0aQO/Xaz.', 'Dr. Somchai', 'STAFF');

-- 2. Locations
INSERT INTO locations (name, building, floor) VALUES
('Triage & Registration', 'Building A', 1),
('Cardiology Clinic', 'Building B', 3),
('Orthopedics', 'Building B', 2),
('X-Ray Department', 'Building A', 1),
('Pharmacy & Cashier', 'Building A', 1);

-- 3. Navigation Nodes
-- Building A, Floor 1
INSERT INTO navigation_nodes (location_id, type) VALUES
(1, 'room'),        -- Node 1: Triage
(4, 'room'),        -- Node 2: X-Ray
(5, 'room'),        -- Node 3: Pharmacy
(NULL, 'hallway'),  -- Node 4: Hallway Intersection Building A
(NULL, 'elevator'); -- Node 5: Elevator Building A

-- Building B, Floor 2 & 3
INSERT INTO navigation_nodes (location_id, type) VALUES
(NULL, 'elevator'), -- Node 6: Elevator Building B Floor 2
(3, 'room'),        -- Node 7: Orthopedics
(NULL, 'elevator'), -- Node 8: Elevator Building B Floor 3
(2, 'room');        -- Node 9: Cardiology Clinic

-- 4. Navigation Edges (Directed paths)
-- Triage -> Hallway Intersection
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(1, 4, 'Exit Triage and walk straight to the main intersection.', 15.0),
(4, 1, 'Walk straight to enter Triage & Registration.', 15.0);

-- Hallway Intersection -> X-Ray
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(4, 2, 'Turn left and walk 10 meters to the X-Ray Department.', 10.0),
(2, 4, 'Exit X-Ray and walk straight to the intersection.', 10.0);

-- Hallway Intersection -> Pharmacy
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(4, 3, 'Turn right and walk 20 meters to Pharmacy & Cashier.', 20.0),
(3, 4, 'Exit Pharmacy and walk straight to the intersection.', 20.0);

-- Hallway Intersection <-> Elevator A
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(4, 5, 'Walk straight 25 meters to the Elevators.', 25.0),
(5, 4, 'Walk straight 25 meters to the Main Intersection.', 25.0);

-- Elevator A (Fl 1) <-> Elevator B (Fl 2) [Mock building connection/lift]
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(5, 6, 'Take the elevator to Floor 2, Building B.', 0.0),
(6, 5, 'Take the elevator down to Floor 1, Building A.', 0.0);

-- Elevator B (Fl 2) <-> Orthopedics
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(6, 7, 'Exit the elevator and walk left to Orthopedics.', 10.0),
(7, 6, 'Exit Orthopedics and walk right to the Elevator.', 10.0);

-- Elevator B (Fl 2) <-> Elevator B (Fl 3)
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(6, 8, 'Take the elevator up to Floor 3.', 0.0),
(8, 6, 'Take the elevator down to Floor 2.', 0.0);

-- Elevator B (Fl 3) <-> Cardiology
INSERT INTO navigation_edges (from_node, to_node, instruction, distance_meters) VALUES
(8, 9, 'Exit the elevator and walk straight to Cardiology Clinic.', 15.0),
(9, 8, 'Exit Cardiology Clinic and walk straight to the Elevator.', 15.0);

-- 5. QR Checkpoints
-- Place a QR checkpoint at the main hallway intersection and elevators for lost patients
INSERT INTO qr_checkpoints (node_id, code_hash) VALUES
(4, 'QR_HALLWAY_INTERSECTION_A'),
(5, 'QR_ELEVATOR_A_FL1'),
(8, 'QR_ELEVATOR_B_FL3');

-- 6. Mock Queues
-- Patient scans token to link. 
INSERT INTO queues (queue_number, token, destination_id, status) VALUES
('Q-001', 'token_abc123', 1, 'Waiting'),
('Q-002', 'token_def456', 2, 'Waiting');

-- 7. Mock Queue History
INSERT INTO queue_history (queue_id, status, staff_id) VALUES
(1, 'Waiting', 2),
(2, 'Waiting', 2);
