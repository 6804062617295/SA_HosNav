const express = require('express');
const router = express.Router();
const { getRoute, getCheckpoint, getAllCheckpoints } = require('../controllers/navigationController');

// All navigation routes are public (patient doesn't need to login)
router.get('/route', getRoute);
router.get('/checkpoints', getAllCheckpoints);
router.get('/checkpoint/:code', getCheckpoint);

module.exports = router;
