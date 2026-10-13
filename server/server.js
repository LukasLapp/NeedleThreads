const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Serve static files from /public (automatically handles index.html for '/')
app.use(express.static(path.join(__dirname, '../public')));

// 2. Health check endpoint required by deploy.sh
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 3. Fallback catch-all for SPA routes (Express 5 / path-to-regexp v8 syntax)
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`NeedleThreads running on port ${PORT}`);
});