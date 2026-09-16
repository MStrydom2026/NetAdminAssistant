/**
 * Analyze Routes
 * Ticket analysis endpoints
 */

const express = require('express');
const router = express.Router();
const { validate } = require('../utils/validators');
const ticketAnalyzer = require('../services/ticketAnalyzer');
const attachmentProcessor = require('../services/attachmentProcessor');
const searchOrchestrator = require('../services/searchOrchestrator');
const logger = require('../utils/logger');
const db = require('../db/init');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/analyze
 * Analyze a support ticket
 */
router.post('/', async (req, res) => {
  try {
    // Validate request
    const { error, value } = validate(req.body, 'analyzeTicket');
    if (error) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.details.map(e => e.message)
      });
    }

    const { ticketId, subject, description, attachments, metadata } = value;
    const analysisId = uuidv4();
    const startTime = Date.now();

    logger.info(`Analyzing ticket: ${ticketId}`);

    // Process attachments if present
    let processedAttachments = [];
    if (attachments && attachments.length > 0) {
      processedAttachments = await attachmentProcessor.processAttachments(ticketId, attachments);
      logger.info(`Processed ${processedAttachments.length} attachments`);
    }

    // Perform analysis
    const analysis = await ticketAnalyzer.analyzeTicket({
      ticketId,
      subject,
      description,
      attachments: processedAttachments,
      metadata
    });

    // Execute search plan
    const searchResults = await searchOrchestrator.executeSearchPlan(
      analysis.searchPlan.queries || [],
      analysis
    );

    const duration = Date.now() - startTime;

    // Log API usage
    try {
      db.insert('api_usage', {
        id: uuidv4(),
        ticket_id: ticketId,
        model: analysis.rootCause.model,
        input_tokens: 0, // Would be populated from actual API response
        output_tokens: 0,
        total_tokens: analysis.rootCause.tokensUsed + analysis.solution.tokensUsed,
        provider: 'azure',
        request_time_ms: duration,
        status: 'success',
        created_at: new Date().toISOString()
      });
    } catch (err) {
      logger.warn('Failed to log API usage:', err.message);
    }

    res.json({
      success: true,
      analysisId,
      ticketId,
      analysis: {
        rootCause: analysis.rootCause,
        solution: analysis.solution,
        searchPlan: analysis.searchPlan,
        searchResults
      },
      attachments: processedAttachments,
      duration,
      timestamp: new Date().toISOString()
    });

    logger.info(`Ticket analysis completed in ${duration}ms: ${ticketId}`);
  } catch (error) {
    logger.error('Analysis failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/analyze/batch
 * Analyze multiple tickets (queue optimization)
 */
router.post('/batch', async (req, res) => {
  try {
    const { tickets } = req.body;

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'tickets must be a non-empty array'
      });
    }

    if (tickets.length > 10) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Maximum 10 tickets per batch'
      });
    }

    logger.info(`Batch analyzing ${tickets.length} tickets`);

    const results = await Promise.allSettled(
      tickets.map(ticket => ticketAnalyzer.analyzeTicket(ticket))
    );

    const successfulAnalyses = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failedAnalyses = results.filter(r => r.status === 'rejected').map(r => r.reason);

    res.json({
      success: failedAnalyses.length === 0,
      totalRequested: tickets.length,
      successful: successfulAnalyses.length,
      failed: failedAnalyses.length,
      results: successfulAnalyses,
      errors: failedAnalyses.map(e => e.message),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Batch analysis failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analyze/search
 * Execute a search plan without full analysis
 */
router.post('/search', async (req, res) => {
  try {
    const { queries } = req.body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'queries must be a non-empty array'
      });
    }

    logger.info(`Executing search for ${queries.length} queries`);

    const results = await searchOrchestrator.executeSearchPlan(queries, {});

    res.json({
      success: true,
      queries: queries.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Search failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
