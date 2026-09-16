/**
 * Attachment Processor
 * Handles file extraction, OCR, and analysis
 */

const logger = require('../utils/logger');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');

class AttachmentProcessor {
  /**
   * Process attachments from ticket
   */
  async processAttachments(ticketId, attachments) {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    logger.info(`Processing ${attachments.length} attachments for ticket ${ticketId}`);
    const results = [];

    for (const attachment of attachments) {
      try {
        const processed = await this.processAttachment(ticketId, attachment);
        results.push(processed);
      } catch (error) {
        logger.warn(`Failed to process attachment ${attachment.name}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Process single attachment
   */
  async processAttachment(ticketId, attachment) {
    const { name, type, content, url } = attachment;
    const id = uuidv4();
    const contentHash = this.calculateHash(content);

    let extractedText = '';
    let analysis = null;

    // Extract text based on file type
    if (type.includes('text') || type.includes('xml') || type.includes('json')) {
      extractedText = content.substring(0, 5000); // First 5000 chars
    } else if (type.includes('image')) {
      // Placeholder for OCR - would need Tesseract or Azure Vision
      extractedText = `[Image: ${name}] - OCR not yet implemented`;
    } else if (type.includes('pdf') || type.includes('word') || type.includes('excel')) {
      // Placeholder for document parsing
      extractedText = `[Document: ${name}] - Content extraction not yet implemented`;
    }

    // Perform basic analysis
    analysis = this.analyzeAttachment(name, type, extractedText);

    // Store in database
    try {
      db.insert('attachments', {
        id,
        ticket_id: ticketId,
        file_name: name,
        file_type: type,
        file_size: content.length,
        content_hash: contentHash,
        extracted_text: extractedText,
        analysis: JSON.stringify(analysis),
        uploaded_at: new Date().toISOString()
      });

      logger.info(`Attachment processed and stored: ${name}`);
    } catch (error) {
      logger.warn(`Failed to store attachment ${name}:`, error.message);
    }

    return {
      id,
      name,
      type,
      size: content.length,
      extractedText,
      analysis
    };
  }

  /**
   * Calculate SHA256 hash of content
   */
  calculateHash(content) {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Analyze attachment for relevant information
   */
  analyzeAttachment(name, type, content) {
    const analysis = {
      fileType: type,
      size: content.length,
      containsErrors: content.toLowerCase().includes('error'),
      containsLogs: content.includes('ERROR') || content.includes('WARN'),
      containsSQL: content.includes('SELECT') || content.includes('UPDATE'),
      containsCode: /\{|\}|function|class|def|return/.test(content),
      topics: this.extractTopics(content)
    };

    return analysis;
  }

  /**
   * Extract key topics from attachment content
   */
  extractTopics(content) {
    const topics = [];
    const keywords = {
      'database': /database|sql|table|query|transaction/gi,
      'authentication': /auth|login|password|token|session/gi,
      'configuration': /config|setting|property|parameter/gi,
      'module': /module|plugin|extension|addon/gi,
      'integration': /api|webhook|integration|sync|connect/gi,
      'error': /error|exception|failure|crash|fault/gi,
      'performance': /slow|timeout|hang|cpu|memory|resource/gi
    };

    for (const [topic, regex] of Object.entries(keywords)) {
      if (regex.test(content)) {
        topics.push(topic);
      }
    }

    return topics;
  }
}

module.exports = new AttachmentProcessor();
