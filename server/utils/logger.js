/**
 * Logger utility
 * Centralized logging with levels and timestamps
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];
const LOG_DIR = './logs';

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const timestamp = () => new Date().toISOString();
const padLevel = (level) => level.toUpperCase().padEnd(5);

function formatMessage(level, message, data = null) {
  let formatted = `[${timestamp()}] [${padLevel(level)}] ${message}`;
  if (data) {
    if (typeof data === 'object') {
      formatted += ` ${JSON.stringify(data)}`;
    } else {
      formatted += ` ${data}`;
    }
  }
  return formatted;
}

function log(level, message, data) {
  if (LOG_LEVELS[level] <= LOG_LEVEL) {
    const formatted = formatMessage(level, message, data);
    
    // Console output with color
    const colors = {
      error: '\x1b[31m',   // red
      warn: '\x1b[33m',    // yellow
      info: '\x1b[36m',    // cyan
      debug: '\x1b[35m'    // magenta
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}${formatted}${reset}`);
    
    // File output (only errors and warnings)
    if (level === 'error' || level === 'warn') {
      const logFile = path.join(LOG_DIR, `${level}.log`);
      fs.appendFileSync(logFile, formatted + '\n');
    }
  }
}

module.exports = {
  error: (msg, data) => log('error', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  info: (msg, data) => log('info', msg, data),
  debug: (msg, data) => log('debug', msg, data)
};
