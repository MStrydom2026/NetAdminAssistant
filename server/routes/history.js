/**
 * History Routes
 * Ticket history and analysis retrieval
 */

const express = require('express');
const router = express.Router();
const { validate } = require('../utils/validators');
const db = require('../db/init');
const logger = require('../utils/logger');

/**
 * GET /api/history/tickets
 * Get ticket history
 */
router.get('/tickets', (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    let query = 'SELECT * FROM tickets';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const tickets = db.query(query, params);

    res.json({
      success: true,
      tickets,
      limit: limitNum,
      offset: offsetNum,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve ticket history:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/tickets/:ticketId
 * Get single ticket details
 */
router.get('/tickets/:ticketId', (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = db.queryOne(
      'SELECT * FROM tickets WHERE ticket_id = ?',
      [ticketId]
    );

    if (!ticket) {
      return res.status(404).json({
        error: 'Ticket not found',
        ticketId
      });
    }

    // Get associated analyses
    const analyses = db.query(
      'SELECT * FROM analyses WHERE ticket_id = ?',
      [ticketId]
    );

    // Get attachments
    const attachments = db.query(
      'SELECT id, file_name, file_type, file_size, analysis FROM attachments WHERE ticket_id = ?',
      [ticketId]
    );

    res.json({
      success: true,
      ticket,
      analyses: analyses.map(a => ({
        ...a,
        evidence: a.evidence ? JSON.parse(a.evidence) : [],
        content: a.content ? JSON.parse(a.content) : a.content
      })),
      attachments: attachments.map(a => ({
        ...a,
        analysis: a.analysis ? JSON.parse(a.analysis) : null
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve ticket:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/analyses/:ticketId
 * Get all analyses for a ticket
 */
router.get('/analyses/:ticketId', (req, res) => {
  try {
    const { ticketId } = req.params;
    const { type } = req.query; // Filter by analysis type

    let query = 'SELECT * FROM analyses WHERE ticket_id = ?';
    const params = [ticketId];

    if (type) {
      query += ' AND analysis_type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const analyses = db.query(query, params);

    res.json({
      success: true,
      ticketId,
      analyses: analyses.map(a => ({
        ...a,
        evidence: a.evidence ? JSON.parse(a.evidence) : [],
        content: a.content ? JSON.parse(a.content) : a.content
      })),
      count: analyses.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve analyses:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/history/feedback
 * Submit feedback on analysis quality
 */
router.post('/feedback', (req, res) => {
  try {
    const { ticketId, analysisType, helpful, notes } = req.body;

    if (!ticketId || !analysisType || helpful === undefined) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'ticketId, analysisType, and helpful are required'
      });
    }

    logger.info(`Feedback received for ${ticketId}/${analysisType}: ${helpful}`);

    // Store feedback (could update solution effectiveness)
    db.run(
      `UPDATE solutions SET 
       was_effective = ?, 
       effectiveness_notes = ?,
       feedback_at = datetime('now')
       WHERE ticket_id = ? AND analysis_id = ?`,
      [helpful, notes || null, ticketId, analysisType]
    );

    res.json({
      success: true,
      message: 'Feedback recorded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to record feedback:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/history/stats
 * Get analysis statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = {
      totalTickets: db.queryOne('SELECT COUNT(*) as count FROM tickets')?.count || 0,
      totalAnalyses: db.queryOne('SELECT COUNT(*) as count FROM analyses')?.count || 0,
      attachmentsProcessed: db.queryOne('SELECT COUNT(*) as count FROM attachments')?.count || 0,
      averageConfidence: db.queryOne('SELECT AVG(confidence) as avg FROM analyses WHERE confidence IS NOT NULL')?.avg || 0,
      byAnalysisType: db.query(
        `SELECT analysis_type, COUNT(*) as count, AVG(confidence) as avg_confidence
         FROM analyses
         GROUP BY analysis_type`
      ),
      tokensUsedToday: db.queryOne(
        `SELECT SUM(tokens_used) as total FROM api_usage 
         WHERE DATE(created_at) = DATE('now')`
      )?.total || 0,
      averageAnalysisTime: db.queryOne(
        `SELECT AVG(analysis_time_ms) as avg FROM analyses WHERE analysis_time_ms > 0`
      )?.avg || 0
    };

    res.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve statistics:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
