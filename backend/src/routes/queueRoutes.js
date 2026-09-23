const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { requireStaffOrAdmin } = require('../middleware/roleMiddleware');
const {
    createQueue,
    getQueues,
    getQueueByToken,
    updateQueueStatus,
    forwardQueue,
    clearQueues
} = require('../controllers/queueController');

// 1. Get queue details by token (Public/Patient - No auth required because patients scan QR without login)
router.get('/track/:token', getQueueByToken);

// --- All routes below require Authentication and Staff/Admin role ---
router.use(verifyToken);
router.use(requireStaffOrAdmin);

// 2. Create a new queue
router.post('/', createQueue);

// 3. Get all queues (Dashboard)
router.get('/', getQueues);

// 4. Update queue status (Waiting -> Called -> Processing -> Completed/Skipped)
router.patch('/:id/status', updateQueueStatus);

// 5. Forward queue to a new destination
router.patch('/:id/forward', forwardQueue);

// 6. Clear all queues (Testing/Prototype)
router.delete('/clear', clearQueues);

module.exports = router;
