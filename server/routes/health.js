const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { config, isAIConfigured } = require('../config/config');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const databaseConnected = db.getInstance() !== null;
    const aiConfigured = isAIConfigured();
    const healthy = databaseConnected;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      service: 'NetAdmin Test Backend',
      version: '0.6.0-test',
      host: config.host,
      port: config.port,
      aiProvider: config.aiProvider,
      aiConfigured,
      aiMessage: aiConfigured ? 'AI provider configured' : 'AI provider is not configured',
      databaseConnected,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error.message);
    res.status(503).json({ status: 'error', error: error.message, timestamp: new Date().toISOString() });
  }
});

router.get('/ready', (req, res) => {
  const ready = db.getInstance() !== null && isAIConfigured();
  res.status(ready ? 200 : 503).json({ ready, aiConfigured: isAIConfigured(), timestamp: new Date().toISOString() });
});

router.get('/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'NetAdmin Test Backend',
    version: '0.6.0-test',
    configuration: {
      environment: config.nodeEnv,
      host: config.host,
      port: config.port,
      aiProvider: config.aiProvider,
      aiConfigured: isAIConfigured(),
      openAIBaseURL: config.aiProvider === 'openai' ? config.openai.baseURL : undefined,
      model: config.aiProvider === 'openai' ? config.openai.model : undefined
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
