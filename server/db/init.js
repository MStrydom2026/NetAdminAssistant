/**
 * Database Initialization
 * Sets up SQLite connection and schema
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let db = null;

/**
 * Initialize database
 * @param {String} dbPath - Path to database file
 */
function init(dbPath) {
  try {
    // Create database file
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? logger.debug : null
    });

    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    logger.info(`Database connection established: ${dbPath}`);

    // Load and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema by semicolon and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    statements.forEach(statement => {
      try {
        db.exec(statement);
      } catch (error) {
        logger.warn('Schema execution warning:', error.message);
      }
    });

    logger.info('Database schema initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error.message);
    throw error;
  }
}

/**
 * Get database instance
 */
function getInstance() {
  if (!db) {
    throw new Error('Database not initialized. Call init() first.');
  }
  return db;
}

/**
 * Close database connection
 */
function close() {
  if (db) {
    db.close();
    logger.info('Database connection closed');
  }
}

/**
 * Execute a query
 * @param {String} sql - SQL query
 * @param {Array} params - Query parameters
 */
function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (error) {
    logger.error('Database query error:', { sql, error: error.message });
    throw error;
  }
}

/**
 * Execute a single row query
 * @param {String} sql - SQL query
 * @param {Array} params - Query parameters
 */
function queryOne(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.get(...params);
  } catch (error) {
    logger.error('Database query error:', { sql, error: error.message });
    throw error;
  }
}

/**
 * Execute an insert/update/delete
 * @param {String} sql - SQL query
 * @param {Array} params - Query parameters
 */
function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (error) {
    logger.error('Database execute error:', { sql, error: error.message });
    throw error;
  }
}

/**
 * Insert record
 * @param {String} table - Table name
 * @param {Object} data - Data to insert
 */
function insert(table, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(',');
  const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
  const values = Object.values(data);
  return run(sql, values);
}

/**
 * Update record
 * @param {String} table - Table name
 * @param {Object} data - Data to update
 * @param {String} where - WHERE clause
 * @param {Array} params - WHERE clause parameters
 */
function update(table, data, where, params = []) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(',');
  const sql = `UPDATE ${table} SET ${sets} WHERE ${where}`;
  const values = [...Object.values(data), ...params];
  return run(sql, values);
}

module.exports = {
  init,
  getInstance,
  close,
  query,
  queryOne,
  run,
  insert,
  update
};
