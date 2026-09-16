/**
 * OpenAI Provider (Fallback)
 * Handles OpenAI API calls as a fallback option
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const { config } = require('../../config/config');

class OpenAIProvider {
  constructor(openaiConfig) {
    this.apiKey = openaiConfig.apiKey;
    this.model = openaiConfig.model || 'gpt-4-turbo';
    this.maxRetries = config.api.maxRetries;
    this.retryDelay = config.api.retryDelayMs;
    this.timeout = config.api.requestTimeoutMs;
    
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Send a chat completion request
   */
  async chat(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured.');
    }

    const startTime = Date.now();
    
    const payload = {
      model: this.model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      top_p: options.topP || 0.95
    };

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        logger.debug(`OpenAI request (attempt ${attempt + 1}/${this.maxRetries})`);
        
        const response = await this.client.post('/chat/completions', payload);
        
        const duration = Date.now() - startTime;
        logger.info(`OpenAI chat completed in ${duration}ms`);
        
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
        logger.warn(`OpenAI request failed (attempt ${attempt + 1}):`, error.message);
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        } else {
          throw this.handleError(error);
        }
      }
    }
  }

  /**
   * Analyze ticket with AI
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
      root_cause: `You are an expert Sage 300 support analyst. Analyze the support ticket and identify the likely root cause.`,
      solution: `You are an expert Sage 300 support specialist. Suggest the most appropriate solution.`,
      search_plan: `You are a Sage support researcher. Create a search strategy to find relevant information.`
    };

    return prompts[analysisType] || prompts.root_cause;
  }

  /**
   * Build prompt from ticket data
   */
  buildTicketPrompt(ticketData, analysisType) {
    const { subject, description } = ticketData;
    return `Subject: ${subject}\n\nDescription: ${description}\n\nProvide a detailed ${analysisType.replace(/_/g, ' ')} analysis.`;
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    let message = 'OpenAI request failed';
    let status = 500;

    if (error.response) {
      status = error.response.status;
      if (error.response.data?.error?.message) {
        message = error.response.data.error.message;
      }
    } else if (error.message) {
      message = error.message;
    }

    logger.error(`OpenAI Error [${status}]:`, message);
    
    const err = new Error(message);
    err.status = status;
    return err;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OpenAIProvider;
