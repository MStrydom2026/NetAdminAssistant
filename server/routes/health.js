/**
 * Health Check Routes
 * Backend health and status endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { config } = require('../config/config');
const logger = require('../utils/logger');

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req, res) => {
  try {
    const dbInstance = db.getInstance();
    const isHealthy = dbInstance !== null;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'NetAdmin Assistant Backend',
      version: '0.5.3',
      timestamp: new Date().toISOString(),
      database: isHealthy ? 'connected' : 'disconnected',
      aiProvider: config.aiProvider,
      features: config.features
    });
  } catch (error) {
    logger.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with database stats
 */
router.get('/detailed', (req, res) => {
  try {
    const stats = {
      ticketsAnalyzed: db.queryOne('SELECT COUNT(*) as count FROM tickets')?.[0] || 0,
      totalAnalyses: db.queryOne('SELECT COUNT(*) as count FROM analyses')?.[0] || 0,
      attachmentsProcessed: db.queryOne('SELECT COUNT(*) as count FROM attachments')?.[0] || 0,
      cachedSearches: db.queryOne('SELECT COUNT(*) as count FROM search_cache')?.[0] || 0,
      apiUsageToday: db.queryOne(
        `SELECT COUNT(*) as count FROM api_usage 
         WHERE DATE(created_at) = DATE('now')`
      )?.[0] || 0
    };

    res.json({
      status: 'healthy',
      service: 'NetAdmin Assistant Backend',
      version: '0.5.3',
      timestamp: new Date().toISOString(),
      configuration: {
        environment: config.nodeEnv,
        aiProvider: config.aiProvider,
        databasePath: config.db.path,
        logLevel: config.logLevel
      },
      features: config.features,
      statistics: stats,
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error.message);
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/ready
 * Readiness check - whether service is ready to accept requests
 */
router.get('/ready', (req, res) => {
  try {
    const isReady = db.getInstance() !== null && config.aiProvider !== 'mock';
    
    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      reason: !isReady ? 'Database not initialized or using mock provider' : 'Ready to accept requests'
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
