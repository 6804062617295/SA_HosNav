const db = require('../db');
const crypto = require('crypto');

// 1. Create a new Queue (Standard Entry - Staff/Admin only)
const createQueue = async (req, res) => {
    try {
        const { destination_id } = req.body;
        
        if (!destination_id) {
            return res.status(400).json({ success: false, message: 'destination_id is required' });
        }

        // Generate a unique token for the QR code
        const token = crypto.randomBytes(16).toString('hex');
        
        // We will generate the queue_number after insertion using the generated ID for simplicity in prototype
        const tempQueueNumber = 'TEMP'; 

        const newQueue = await db.query(
            'INSERT INTO queues (queue_number, token, destination_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [tempQueueNumber, token, destination_id, 'Waiting']
        );

        const queueId = newQueue.rows[0].queue_id;
        const finalQueueNumber = `Q-${String(queueId).padStart(3, '0')}`;

        // Update the queue with the final number
        const updatedQueue = await db.query(
            'UPDATE queues SET queue_number = $1 WHERE queue_id = $2 RETURNING *',
            [finalQueueNumber, queueId]
        );

        // Record History
        await db.query(
            'INSERT INTO queue_history (queue_id, status, staff_id) VALUES ($1, $2, $3)',
            [queueId, 'Waiting', req.user.user_id]
        );

        res.status(201).json({
            success: true,
            data: updatedQueue.rows[0],
            message: 'Queue created successfully'
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 2. Get Queues (Staff/Admin only - for Dashboard)
const getQueues = async (req, res) => {
    try {
        const { destination_id } = req.query;
        let query = `
            SELECT q.*, l.name as destination_name 
            FROM queues q
            JOIN locations l ON q.destination_id = l.location_id
        `;
        const params = [];

        if (destination_id) {
            query += ' WHERE q.destination_id = $1';
            params.push(destination_id);
        }

        query += ' ORDER BY q.created_at ASC';

        const result = await db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 3. Get Queue by Token (Patient / Guest - for tracking)
const getQueueByToken = async (req, res) => {
    try {
        const { token } = req.params;
        
        const result = await db.query(`
            SELECT q.*, l.name as destination_name 
            FROM queues q
            JOIN locations l ON q.destination_id = l.location_id
            WHERE q.token = $1
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Queue not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 4. Update Queue Status (Staff/Admin only)
const updateQueueStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['Waiting', 'Called', 'Processing', 'Completed', 'Skipped'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const result = await db.query(
            'UPDATE queues SET status = $1 WHERE queue_id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Queue not found' });
        }

        // Record History
        await db.query(
            'INSERT INTO queue_history (queue_id, status, staff_id) VALUES ($1, $2, $3)',
            [id, status, req.user.user_id]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 5. Forward Queue (Staff/Admin only)
const forwardQueue = async (req, res) => {
    try {
        const { id } = req.params;
        const { destination_id } = req.body;

        if (!destination_id) {
            return res.status(400).json({ success: false, message: 'New destination_id is required' });
        }

        // Change destination and reset status to 'Waiting'
        const result = await db.query(
            'UPDATE queues SET destination_id = $1, status = $2 WHERE queue_id = $3 RETURNING *',
            [destination_id, 'Waiting', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Queue not found' });
        }

        // Record History
        await db.query(
            'INSERT INTO queue_history (queue_id, status, staff_id) VALUES ($1, $2, $3)',
            [id, 'Waiting', req.user.user_id]
        );

        res.json({ success: true, data: result.rows[0], message: 'Queue forwarded successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// 6. Clear All Queues (For Testing/Prototype)
const clearQueues = async (req, res) => {
    try {
        await db.query('TRUNCATE TABLE queues CASCADE');
        res.json({ success: true, message: 'All queues cleared successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    createQueue,
    getQueues,
    getQueueByToken,
    updateQueueStatus,
    forwardQueue,
    clearQueues
};
