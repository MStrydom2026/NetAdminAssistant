const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { config, isAIConfigured } = require('../config/config');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const databaseConnected = db.getInstance() !== null;
    const aiConfigured = isAIConfigured();
    res.status(databaseConnected ? 200 : 503).json({ status: databaseConnected ? 'healthy' : 'unhealthy', service: 'NetAdmin Assistant Backend', version: '0.5.4', timestamp: new Date().toISOString(), database: databaseConnected ? 'connected' : 'disconnected', aiProvider: config.aiProvider, aiConfigured, aiMessage: aiConfigured ? 'AI provider configured' : `Set the credentials for ${config.aiProvider} in server/.env and restart the server`, features: config.features });
  } catch (error) {
    logger.error('Health check failed:', error.message);
    res.status(503).json({ status: 'error', error: error.message, timestamp: new Date().toISOString() });
  }
});
router.get('/detailed', (req, res) => res.json({ status: 'healthy', service: 'NetAdmin Assistant Backend', version: '0.5.4', timestamp: new Date().toISOString(), configuration: { environment: config.nodeEnv, aiProvider: config.aiProvider, aiConfigured: isAIConfigured(), databasePath: config.db.path, logLevel: config.logLevel }, features: config.features, uptime: process.uptime() }));
router.get('/ready', (req, res) => { const ready = db.getInstance() !== null && isAIConfigured(); res.status(ready ? 200 : 503).json({ ready, timestamp: new Date().toISOString(), reason: ready ? 'Ready to accept requests' : 'Database or AI provider is not configured' }); });
module.exports = router;
