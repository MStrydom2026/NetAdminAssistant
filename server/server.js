#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./utils/logger');
const db = require('./db/init');
const { config, validateConfig } = require('./config/config');
const healthRoutes = require('./routes/health');
const analyzeRoutes = require('./routes/analyze');
const historyRoutes = require('./routes/history');

const app = express();
const dbPath = config.db.path;
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

db.init(dbPath);
validateConfig();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({ origin: config.security.corsAllowedOrigins, credentials: true }));
app.use((req, res, next) => { logger.info(`${req.method} ${req.path}`); next(); });

app.use('/health', healthRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRoutes);

app.get('/', (req, res) => res.json({
  status: 'ok',
  message: 'NetAdmin Test Backend is running',
  service: 'NetAdmin Test Backend',
  version: '0.6.0-test',
  model: config.openai.model,
  baseURL: config.openai.baseURL,
  timestamp: new Date().toISOString()
}));

app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path, method: req.method }));
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message, timestamp: new Date().toISOString() });
});

const server = app.listen(config.port, config.host, () => {
  logger.info(`NetAdmin Test Backend listening at http://${config.host}:${config.port}`);
  logger.info(`AI provider: ${config.aiProvider}; endpoint: ${config.openai.baseURL}; model: ${config.openai.model}`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
