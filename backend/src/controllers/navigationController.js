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

        const nodesInfo = nodesData.rows;
        const getNode = id => nodesInfo.find(n => n.node_id === id);

        const rawInst = result.instructions;
        const mergedInst = [];
        let currentGroup = null;

        for (let i = 0; i < rawInst.length; i++) {
            let step = rawInst[i];
            
            if (!currentGroup) {
                currentGroup = { ...step };
            } else {
                let n0 = getNode(currentGroup.from);
                let n1 = getNode(currentGroup.to);
                let n2 = getNode(step.to);

                let isCollinear = false;
                if (n0 && n1 && n2 && n0.node_floor === n1.node_floor && n1.node_floor === n2.node_floor) {
                    let len1 = Math.hypot(n1.pos_x - n0.pos_x, n1.pos_y - n0.pos_y);
                    let len2 = Math.hypot(n2.pos_x - n1.pos_x, n2.pos_y - n1.pos_y);
                    
                    if (len1 > 0 && len2 > 0) {
                        let dx1 = (n1.pos_x - n0.pos_x) / len1;
                        let dy1 = (n1.pos_y - n0.pos_y) / len1;
                        let dx2 = (n2.pos_x - n1.pos_x) / len2;
                        let dy2 = (n2.pos_y - n1.pos_y) / len2;

                        let cross = dx1 * dy2 - dy1 * dx2;
                        let dot = dx1 * dx2 + dy1 * dy2;

                        // Same direction if cross product ~ 0 and dot product ~ 1
                        if (Math.abs(cross) < 0.1 && dot > 0.9) {
                            isCollinear = true;
                        }
                    }
                }

                if (isCollinear) {
                    // Merge step
                    currentGroup.to = step.to;
                    currentGroup.distance += step.distance;
                } else {
                    mergedInst.push(currentGroup);
                    currentGroup = { ...step };
                }
            }
        }
        if (currentGroup) mergedInst.push(currentGroup);

        res.json({
            success: true,
            data: {
                path: result.path,
                nodes_info: nodesData.rows,
                instructions: mergedInst,
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
