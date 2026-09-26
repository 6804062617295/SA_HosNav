const { findShortestPath } = require('../services/navigationService');
const db = require('../db');

// GET /api/navigation/route?from_node=1&to_node=9 (or to_location=2)
const getRoute = async (req, res) => {
    try {
        let { from_node, to_node, to_location } = req.query;
        if (!from_node || (!to_node && !to_location)) {
            return res.status(400).json({ success: false, message: 'from_node and either to_node or to_location are required' });
        }

        // --- Handle 'waiting-room' keyword: resolve to General Waiting Room node ---
        if (from_node === 'waiting-room' || from_node === '1') {
            const wrRes = await db.query("SELECT n.node_id FROM navigation_nodes n JOIN locations l ON n.location_id = l.location_id WHERE l.name = 'General Waiting Room' LIMIT 1");
            if (wrRes.rows.length > 0) {
                from_node = wrRes.rows[0].node_id;
            }
        }

        if (to_location && !to_node) {
            const nodeRes = await db.query('SELECT node_id FROM navigation_nodes WHERE location_id = $1 LIMIT 1', [to_location]);
            if (nodeRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Destination node not found for location' });
            to_node = nodeRes.rows[0].node_id;
        }

        const result = await findShortestPath(from_node, to_node);
        if (!result.success) {
            return res.status(404).json(result);
        }

        // Fetch location names for the nodes
        const nodesData = await db.query(`
            SELECT n.node_id, n.pos_x, n.pos_y, n.floor as node_floor, l.name, l.building, l.floor 
            FROM navigation_nodes n 
            LEFT JOIN locations l ON n.location_id = l.location_id
            WHERE n.node_id = ANY($1::int[])
        `, [result.path]);

        res.json({
            success: true,
            data: {
                path: result.path,
                nodes_info: nodesData.rows,
                instructions: result.instructions,
                total_distance: result.totalDistance
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'System error. Please try again later.' });
    }
};

// GET /api/navigation/checkpoint/:code
// For when a patient scans a QR checkpoint, returns the node_id to use as their current location
const getCheckpoint = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await db.query(`
            SELECT c.qr_id, c.code_hash, n.node_id, l.name as location_name, l.building, l.floor
            FROM qr_checkpoints c
            JOIN navigation_nodes n ON c.node_id = n.node_id
            LEFT JOIN locations l ON n.location_id = l.location_id
            WHERE c.code_hash = $1
        `, [code]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid checkpoint QR code' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'System error. Please try again later.' });
    }
};

module.exports = { getRoute, getCheckpoint };
