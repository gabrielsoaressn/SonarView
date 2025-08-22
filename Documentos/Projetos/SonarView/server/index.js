const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../build')));

// API routes
app.use('/api', apiRoutes);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Start the scheduler for SonarCloud data collection
scheduler.start();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aurora View server running on port ${PORT}`);
  console.log('SonarCloud metrics collection started - runs every 10 minutes');
});
