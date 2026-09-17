const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow frontend to communicate with backend
app.use(express.json()); // Parse JSON request bodies

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Backend is running smoothly!' });
});

const authRoutes = require('./src/routes/authRoutes');

// Routes
app.use('/api/auth', authRoutes);

// Mock Route for Queues (to connect with Frontend before DB is ready)
app.get('/api/queues', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, queue_number: 'Q-001', destination: 'Triage', status: 'Processing' },
            { id: 2, queue_number: 'Q-002', destination: 'Triage', status: 'Waiting' }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
