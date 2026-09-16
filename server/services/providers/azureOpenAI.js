/**
 * Azure OpenAI Provider
 * Handles all Azure OpenAI API calls with retries and error handling
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const { config } = require('../../config/config');

class AzureOpenAIProvider {
  constructor(azureConfig) {
    this.apiKey = azureConfig.apiKey;
    this.endpoint = azureConfig.endpoint;
    this.deploymentName = azureConfig.deploymentName;
    this.apiVersion = azureConfig.apiVersion;
    this.maxRetries = config.api.maxRetries;
    this.retryDelay = config.api.retryDelayMs;
    this.timeout = config.api.requestTimeoutMs;
    
    this.client = axios.create({
      baseURL: this.endpoint,
      timeout: this.timeout,
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured() {
    return !!this.apiKey && !!this.endpoint && !!this.deploymentName;
  }

  /**
   * Send a chat completion request
   * @param {Array} messages - Chat messages
   * @param {Object} options - Additional options (temperature, max_tokens, etc)
   * @returns {Promise<Object>} Response with content and usage info
   */
  async chat(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Azure OpenAI not properly configured. Check API key, endpoint, and deployment name.');
    }

    const startTime = Date.now();
    const url = `/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;
    
    const payload = {
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      top_p: options.topP || 0.95,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0,
      stop: options.stop || null
    };

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        logger.debug(`Azure OpenAI request (attempt ${attempt + 1}/${this.maxRetries})`);
        
        const response = await this.client.post(url, payload);
        
        const duration = Date.now() - startTime;
        logger.info(`Azure OpenAI chat completed in ${duration}ms`);
        
        return {
          content: response.data.choices[0].message.content,
          model: response.data.model,
          usage: {
            promptTokens: response.data.usage.prompt_tokens,
            completionTokens: response.data.usage.completion_tokens,
            totalTokens: response.data.usage.total_tokens
          },
          duration
        };
      } catch (error) {
        logger.warn(`Azure OpenAI request failed (attempt ${attempt + 1}):`, error.message);
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          logger.info(`Retrying after ${delay}ms...`);
          await this.sleep(delay);
        } else {
          throw this.handleError(error);
        }
      }
    }
  }

  /**
   * Analyze ticket with AI
   * @param {Object} ticketData - Ticket information
   * @param {String} analysisType - Type of analysis (root_cause, solution, search_plan)
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeTicket(ticketData, analysisType) {
    const systemPrompt = this.getSystemPrompt(analysisType);
    const userPrompt = this.buildTicketPrompt(ticketData, analysisType);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return this.chat(messages, {
      temperature: 0.3,
      maxTokens: 2000
    });
  }

  /**
   * Get system prompt based on analysis type
   */
  getSystemPrompt(analysisType) {
    const prompts = {
      root_cause: `You are an expert Sage 300 support analyst. Analyze the support ticket and identify the likely root cause. 
Consider:
- Common configuration issues
- Module-specific problems
- Third-party integrations
- User error vs. system issues
Provide a structured analysis with confidence level.`,
      
      solution: `You are an expert Sage 300 support specialist. Based on the ticket information, suggest the most appropriate solution.
Consider:
- Similar past tickets
- Known workarounds
- Sage KB articles
- Step-by-step resolution
Provide a clear, actionable solution with implementation steps.`,
      
      search_plan: `You are a Sage support researcher. Create a search strategy to find relevant information.
Identify:
- Key search terms
- Relevant Sage KB sections
- Community forum keywords
- Third-party documentation sources
Provide a structured search plan with prioritized queries.`
    };

    return prompts[analysisType] || prompts.root_cause;
  }

  /**
   * Build prompt from ticket data
   */
  buildTicketPrompt(ticketData, analysisType) {
    const { subject, description, attachments, metadata } = ticketData;
    
    let prompt = `TICKET INFORMATION:\n`;
    prompt += `Subject: ${subject}\n`;
    prompt += `Description: ${description}\n`;
    
    if (attachments && attachments.length > 0) {
      prompt += `\nAttachments: ${attachments.length}\n`;
      attachments.forEach(att => {
        prompt += `- ${att.name} (${att.type})\n`;
        if (att.extractedText) {
          prompt += `  Content: ${att.extractedText.substring(0, 500)}...\n`;
        }
      });
    }

    if (metadata) {
      prompt += `\nMetadata: ${JSON.stringify(metadata)}\n`;
    }

    prompt += `\nPlease provide a detailed ${analysisType.replace(/_/g, ' ')} analysis.`;
    return prompt;
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    let message = 'Azure OpenAI request failed';
    let status = 500;

    if (error.response) {
      status = error.response.status;
      const data = error.response.data;

      if (data.error) {
        message = data.error.message || data.error.code;
      } else {
        message = `HTTP ${status}: ${error.response.statusText}`;
      }

      // Handle specific error codes
      if (status === 401) {
        message = 'Azure OpenAI authentication failed. Check API key.';
      } else if (status === 429) {
        message = 'Rate limit exceeded. Please retry after a moment.';
      } else if (status === 404) {
        message = 'Deployment not found. Check deployment name.';
      }
    } else if (error.code === 'ECONNABORTED') {
      message = 'Request timeout. Azure OpenAI is not responding.';
      status = 504;
    } else if (error.message) {
      message = error.message;
    }

    logger.error(`Azure OpenAI Error [${status}]:`, message);
    
    const err = new Error(message);
    err.status = status;
    err.code = error.code;
    return err;
  }

  /**
   * Sleep helper for retries
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AzureOpenAIProvider;
