const express = require('express');
const sonarCloudService = require('../services/sonarcloud');
const dataStore = require('../services/dataStore');
const scheduler = require('../services/scheduler');

const router = express.Router();

// Get latest metrics
router.get('/metrics/latest', async (req, res) => {
  try {
    const metrics = await dataStore.getLatestMetrics();
    
    if (!metrics) {
      return res.status(404).json({ 
        error: 'No metrics data available',
        message: 'Please wait for the first data collection cycle to complete'
      });
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest metrics', details: error.message });
  }
});

// Get metrics history
router.get('/metrics/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const metrics = await dataStore.getMetricsHistory(hours);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics history', details: error.message });
  }
});

// Get all metrics
router.get('/metrics/all', async (req, res) => {
  try {
    const metrics = await dataStore.getAllMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all metrics', details: error.message });
  }
});

// Get data statistics
router.get('/metrics/stats', async (req, res) => {
  try {
    const stats = await dataStore.getMetricsStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics stats', details: error.message });
  }
});

// Force metrics collection
router.post('/metrics/collect', async (req, res) => {
  try {
    await scheduler.forceCollection();
    res.json({ message: 'Metrics collection triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger metrics collection', details: error.message });
  }
});

// Get quality gate status
router.get('/quality-gate', async (req, res) => {
  try {
    const metrics = await dataStore.getLatestMetrics();
    
    if (!metrics) {
      return res.status(404).json({ error: 'No metrics data available' });
    }

    const qualityGate = {
      overallStatus: metrics.overallRating,
      gates: {
        reliability: {
          status: metrics.reliability.rating,
          bugs: metrics.reliability.bugs,
          passed: metrics.reliability.rating <= 'B'
        },
        security: {
          status: metrics.security.rating,
          vulnerabilities: metrics.security.vulnerabilities,
          passed: metrics.security.rating <= 'B'
        },
        maintainability: {
          status: metrics.maintainability.rating,
          codeSmells: metrics.maintainability.codeSmells,
          debtRatio: metrics.maintainability.debtRatio,
          passed: metrics.maintainability.rating <= 'B' && metrics.maintainability.debtRatio < 10
        }
      },
      timestamp: metrics.timestamp
    };

    res.json(qualityGate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quality gate status', details: error.message });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Aurora View API'
  });
});

module.exports = router;
