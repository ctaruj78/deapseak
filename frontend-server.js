// Simple static file server for frontend
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.FRONTEND_PORT || 5000;

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    credentials: true
}));

// Serve static files from root directory
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        // Set proper content types
        if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        // Disable caching for development
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}));

// Serve pages directory
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Serve assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Health check
app.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        server: 'frontend',
        timestamp: new Date().toISOString()
    });
});

// Default route - redirect to login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════╗
║       DeapSeaK Frontend Server                 ║
╠════════════════════════════════════════════════╣
║  Status: Running ✓                             ║
║  Port: ${PORT}                                    ║
║  Access:                                       ║
║  • http://localhost:${PORT}                      ║
║  • http://localhost:${PORT}/login.html          ║
╚════════════════════════════════════════════════╝
    `);
});
