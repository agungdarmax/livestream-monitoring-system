require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static HLS files
const path = require('path');
app.use('/streams', express.static(path.join(__dirname, '../streams')));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Livestream API is running!',
    version: '1.0.0'
  });
});

// Routes (kita bikin nanti)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/streams', require('./routes/streamRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});

module.exports = app;