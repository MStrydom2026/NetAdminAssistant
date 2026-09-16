#!/usr/bin/env node
/**
 * NetAdmin Assistant - Backend Server
 * AI-powered Sage 300 support ticket analyzer
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./utils/logger');
const db = require('./db/init');
const { validateConfig } = require('./config/config');

// Routes
const healthRoutes = require('./routes/health');
const analyzeRoutes = require('./routes/analyze');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const dbPath = process.env.DB_PATH || './data/netadmin-assistant.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info(`Created database directory: ${dbDir}`);
}

// Initialize database connection
try {
  db.init(dbPath);
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Validate configuration on startup
try {
  validateConfig();
  logger.info('Configuration validated successfully');
} catch (error) {
  logger.warn('Configuration warning:', error.message);
}

// Routes
app.use('/health', healthRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRoutes);

// Health check endpoint (redundant but explicit)
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'NetAdmin Assistant Backend',
    version: '0.5.3',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error'
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════════════════╗
║   NetAdmin Assistant Backend Started                   ║
║          Listening on port ${PORT}                        ║
║        Environment: ${process.env.NODE_ENV || 'development'}        ║
╚════════════════════════════════════════════════════════╝
  `);
  logger.info(`API Documentation: http://localhost:${PORT}/docs (coming soon)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    db.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    db.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
