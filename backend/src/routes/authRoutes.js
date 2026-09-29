const express = require('express');
const router = express.Router();
const { requestOtp, register, login } = require('../controllers/authController');

// POST /api/auth/register/otp
router.post('/register/otp', requestOtp);

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

module.exports = router;
