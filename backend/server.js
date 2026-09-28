const express = require('express');
const cors = require('cors');
const db = require('./src/db'); // Added DB import for health check and shutdown

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow frontend to communicate with backend
app.use(express.json()); // Parse JSON request bodies

// DB-Aware Health check route (Avoids returning 200 before DB is ready)
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({ success: true, message: 'Backend and DB are ready!' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({ success: false, message: 'Database is not ready' });
    }
});

const authRoutes = require('./src/routes/authRoutes');
const queueRoutes = require('./src/routes/queueRoutes');
const navRoutes = require('./src/routes/navigationRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/navigation', navRoutes);

// Capture the server instance
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// --- Graceful Shutdown Logic (Catching SIGTERM / SIGINT) ---
const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    
    // Stop accepting new HTTP connections
    server.close(async () => {
        console.log('HTTP server closed. All in-flight requests finished.');
        try {
            // Drain database connection pool
            if (db.end) {
                await db.end();
                console.log('Database connection pool closed.');
            }
            process.exit(0);
        } catch (err) {
            console.error('Error during database shutdown:', err);
            process.exit(1);
        }
    });

    // Force shutdown if it takes too long (e.g. hanging keep-alive connections)
    // We set this slightly shorter than Render's default 30s limit to allow our own logging
    setTimeout(() => {
        console.error('Could not gracefully close connections in time, forcing shutdown');
        process.exit(1);
    }, 25000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
