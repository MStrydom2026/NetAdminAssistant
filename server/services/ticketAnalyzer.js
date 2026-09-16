/**
 * Ticket Analyzer Service
 * Core logic for analyzing support tickets
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const db = require('../db/init');
const { getAIProvider } = require('../config/config');

class TicketAnalyzer {
  constructor() {
    this.aiProvider = getAIProvider();
  }

  /**
   * Analyze a complete ticket
   * Performs: root cause analysis, solution recommendation, search planning
   */
  async analyzeTicket(ticketData) {
    const { ticketId, subject, description, attachments, metadata } = ticketData;
    const analysisId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info(`Starting analysis for ticket: ${ticketId}`);

      // Store ticket in database
      const ticket = await this.storeTicket(ticketId, ticketData);

      // Perform three types of analysis
      const [rootCause, solution, searchPlan] = await Promise.all([
        this.analyzeRootCause(ticketData),
        this.analyzeSolution(ticketData),
        this.analyzeSearchPlan(ticketData)
      ]);

      // Store analyses in database
      await this.storeAnalysis(ticket.id, 'root_cause', rootCause);
      await this.storeAnalysis(ticket.id, 'solution', solution);
      await this.storeAnalysis(ticket.id, 'search_plan', searchPlan);

      const duration = Date.now() - startTime;

      return {
        ticketId,
        analysisId,
        rootCause,
        solution,
        searchPlan,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Analysis failed for ticket ${ticketId}:`, error.message);
      throw error;
    }
  }

  /**
   * Analyze root cause
   */
  async analyzeRootCause(ticketData) {
    try {
      const startTime = Date.now();
      const result = await this.aiProvider.analyzeTicket(ticketData, 'root_cause');
      
      return {
        content: result.content,
        confidence: this.calculateConfidence(result.content),
        model: result.model,
        tokensUsed: result.usage.totalTokens,
        duration: Date.now() - startTime,
        evidence: this.extractEvidence(result.content)
      };
    } catch (error) {
      logger.error('Root cause analysis failed:', error.message);
      // Return local analysis fallback
      return this.localRootCauseAnalysis(ticketData);
    }
  }

  /**
   * Analyze solution
   */
  async analyzeSolution(ticketData) {
    try {
      const startTime = Date.now();
      const result = await this.aiProvider.analyzeTicket(ticketData, 'solution');
      
      return {
        content: result.content,
        confidence: this.calculateConfidence(result.content),
        model: result.model,
        tokensUsed: result.usage.totalTokens,
        duration: Date.now() - startTime,
        steps: this.extractSteps(result.content)
      };
    } catch (error) {
      logger.error('Solution analysis failed:', error.message);
      return this.localSolutionAnalysis(ticketData);
    }
  }

  /**
   * Analyze search plan
   */
  async analyzeSearchPlan(ticketData) {
    try {
      const startTime = Date.now();
      const result = await this.aiProvider.analyzeTicket(ticketData, 'search_plan');
      
      return {
        content: result.content,
        model: result.model,
        tokensUsed: result.usage.totalTokens,
        duration: Date.now() - startTime,
        queries: this.extractSearchQueries(result.content)
      };
    } catch (error) {
      logger.error('Search plan analysis failed:', error.message);
      return this.localSearchPlanAnalysis(ticketData);
    }
  }

  /**
   * Local analysis fallback (when AI is unavailable)
   */
  localRootCauseAnalysis(ticketData) {
    const { subject, description } = ticketData;
    const keywords = [subject, description].join(' ').toLowerCase();

    let cause = 'Unable to determine root cause - AI analysis unavailable';
    let confidence = 0.3;

    if (keywords.includes('module') || keywords.includes('install')) {
      cause = 'Likely module installation or configuration issue';
      confidence = 0.6;
    } else if (keywords.includes('error') || keywords.includes('crash')) {
      cause = 'Application error or crash detected - check system logs';
      confidence = 0.5;
    } else if (keywords.includes('permission') || keywords.includes('access')) {
      cause = 'User permissions or access control issue';
      confidence = 0.7;
    }

    return {
      content: cause,
      confidence,
      model: 'local-analysis',
      tokensUsed: 0,
      duration: 50,
      evidence: []
    };
  }

  localSolutionAnalysis(ticketData) {
    return {
      content: 'Recommended steps:\n1. Check system logs for errors\n2. Verify user permissions\n3. Restart the affected service\n4. Contact Sage support if issue persists',
      confidence: 0.5,
      model: 'local-analysis',
      tokensUsed: 0,
      duration: 50,
      steps: ['Check logs', 'Verify permissions', 'Restart service']
    };
  }

  localSearchPlanAnalysis(ticketData) {
    return {
      content: 'Search Sage KB for relevant articles and community forum posts',
      model: 'local-analysis',
      tokensUsed: 0,
      duration: 50,
      queries: ['Sage 300 troubleshooting', 'common errors', 'configuration guide']
    };
  }

  /**
   * Extract confidence level from response
   */
  calculateConfidence(content) {
    const text = content.toLowerCase();
    if (text.includes('high confidence') || text.includes('definitely')) return 0.9;
    if (text.includes('likely') || text.includes('probably')) return 0.7;
    if (text.includes('possible') || text.includes('may')) return 0.5;
    if (text.includes('uncertain') || text.includes('unknown')) return 0.3;
    return 0.6;
  }

  /**
   * Extract evidence points from analysis
   */
  extractEvidence(content) {
    const evidence = [];
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('-') || line.includes('•')) {
        evidence.push(line.trim());
      }
    });
    return evidence.slice(0, 5); // Top 5 evidence points
  }

  /**
   * Extract resolution steps from solution text
   */
  extractSteps(content) {
    const steps = [];
    const lines = content.split('\n');
    let stepNum = 1;
    
    lines.forEach(line => {
      if (/^\d+\./.test(line) || line.includes('Step')) {
        steps.push(line.trim());
      }
    });
    
    return steps.length > 0 ? steps : ['Refer to detailed analysis for resolution steps'];
  }

  /**
   * Extract search queries from search plan
   */
  extractSearchQueries(content) {
    const queries = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (line.includes('"') || /^[-•]/.test(line.trim())) {
        const query = line.replace(/^[-•]\s*/, '').replace(/"/g, '').trim();
        if (query.length > 3 && query.length < 100) {
          queries.push(query);
        }
      }
    });
    
    return queries.length > 0 ? queries : ['General Sage troubleshooting'];
  }

  /**
   * Store ticket in database
   */
  async storeTicket(ticketId, ticketData) {
    const id = uuidv4();
    const now = new Date().toISOString();

    try {
      db.insert('tickets', {
        id,
        ticket_id: ticketId,
        subject: ticketData.subject,
        description: ticketData.description,
        customer_name: ticketData.metadata?.customerName || null,
        customer_email: ticketData.metadata?.customerEmail || null,
        status: 'open',
        priority: ticketData.metadata?.priority || 'medium',
        created_at: now,
        updated_at: now,
        source: 'netadmin',
        metadata: JSON.stringify(ticketData.metadata || {})
      });

      logger.info(`Ticket stored: ${id}`);
      return { id, ticket_id: ticketId };
    } catch (error) {
      logger.error('Failed to store ticket:', error.message);
      throw error;
    }
  }

  /**
   * Store analysis result in database
   */
  async storeAnalysis(ticketId, analysisType, analysisResult) {
    const id = uuidv4();
    const now = new Date().toISOString();

    try {
      db.insert('analyses', {
        id,
        ticket_id: ticketId,
        analysis_type: analysisType,
        content: analysisResult.content,
        confidence: analysisResult.confidence || null,
        evidence: JSON.stringify(analysisResult.evidence || []),
        model_used: analysisResult.model || 'unknown',
        tokens_used: analysisResult.tokensUsed || 0,
        analysis_time_ms: analysisResult.duration || 0,
        created_at: now
      });

      logger.info(`Analysis stored: ${id} (type: ${analysisType})`);
    } catch (error) {
      logger.error('Failed to store analysis:', error.message);
      throw error;
    }
  }
}

module.exports = new TicketAnalyzer();
