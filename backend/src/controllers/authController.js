const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'prototype-secret-key';
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const otps = new Map(); // email -> { code, expires, sentAt, attempts }

// Resend HTTP API
const sendOtpEmail = async (to, code) => {
    // Local dev without a Resend key: print the code instead of emailing it
    if (!process.env.RESEND_API_KEY) return console.log(`[OTP] RESEND_API_KEY not set, code for ${to}: ${code}`);

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'HospitalNav <noreply@akarancubic.dev>',
            to,
            subject: 'Your HospitalNav verification code',
            text: `Your HospitalNav verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`
        })
    });
    if (!res.ok) throw new Error(`OTP email failed: ${res.status} ${await res.text()}`);
};

// Send registration OTP
const requestOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        const userExists = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'This email is already registered' });
        }

        const now = Date.now();
        for (const [k, v] of otps) if (v.expires < now) otps.delete(k);

        const prev = otps.get(email);
        if (prev && now - prev.sentAt < OTP_RESEND_MS) {
            return res.status(429).json({ success: false, message: 'Please wait a minute before requesting another code' });
        }

        const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
        await sendOtpEmail(email, code);
        otps.set(email, { code, expires: now + OTP_TTL_MS, sentAt: now, attempts: 0 });

        res.json({ success: true, message: 'Verification code sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Could not send verification code. Please try again later.' });
    }
};

// Patient Registration
const register = async (req, res) => {
    try {
        const { email, password, name, otp } = req.body;

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        const entry = otps.get(email);
        if (!entry || entry.expires < Date.now() || entry.attempts >= OTP_MAX_ATTEMPTS) {
            otps.delete(email);
            return res.status(400).json({ success: false, message: 'Verification code expired. Please request a new one' });
        }
        if (String(otp) !== entry.code) {
            entry.attempts++;
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }
        otps.delete(email);

        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'This email is already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new patient (role defaults to PATIENT in schema)
        const newUser = await db.query(
            'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING user_id, email, name, role',
            [email, passwordHash, name, 'PATIENT']
        );

        res.status(201).json({
            success: true,
            data: newUser.rows[0],
            message: 'Registration successful'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'System error. Please try again later.' });
    }
};

// User Login (Patient, Staff, Admin)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Email or password incorrect' });
        }

        const user = result.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Email or password incorrect' });
        }

        // Generate Token
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.user_id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'System error. Please try again later.' });
    }
};

module.exports = {
    requestOtp,
    register,
    login
};
