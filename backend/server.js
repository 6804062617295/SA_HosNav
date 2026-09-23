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
const queueRoutes = require('./src/routes/queueRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/queues', queueRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
