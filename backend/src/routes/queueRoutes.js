const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { requireStaffOrAdmin } = require('../middleware/roleMiddleware');
const {
    createQueue,
    getQueues,
    getQueueByToken,
    getMyActiveQueue,
    updateQueueStatus,
    forwardQueue,
    clearQueues
} = require('../controllers/queueController');

// Optional auth middleware just to parse the token if it exists without rejecting
const optionalAuth = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
        const jwt = require('jsonwebtoken');
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET || 'prototype-secret-key');
        } catch (e) {} // ignore invalid tokens here
    }
    next();
};

// 1. Get queue details by token (Public/Patient - No auth required because patients scan QR without login, but can link if logged in)
router.get('/track/:token', optionalAuth, getQueueByToken);

// 1.5 Get active queue for patient (Patient - Auth required)
router.get('/my-active', verifyToken, getMyActiveQueue);

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
