const axios = require('axios');
const logger = require('../../utils/logger');
const { config } = require('../../config/config');

class OpenAIProvider {
  constructor(openaiConfig) {
    this.apiKey = openaiConfig.apiKey || '';
    this.baseURL = (openaiConfig.baseURL || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.model = openaiConfig.model || 'gpt-4o-mini';
    this.maxRetries = config.api.maxRetries;
    this.retryDelay = config.api.retryDelayMs;
    this.timeout = config.api.requestTimeoutMs;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        'Content-Type': 'application/json'
      }
    });
  }

  isConfigured() {
    return Boolean(this.baseURL) && (!this.baseURL.includes('api.openai.com') || Boolean(this.apiKey));
  }

  async chat(messages, options = {}) {
    if (!this.isConfigured()) throw new Error('OpenAI-compatible provider is not configured.');

    const startTime = Date.now();
    const payload = {
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      top_p: options.topP ?? 0.95
    };

    for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
      try {
        const response = await this.client.post('/chat/completions', payload);
        const data = response.data || {};
        const choice = data.choices?.[0];
        if (!choice?.message?.content) throw new Error('The AI engine returned no message content.');
        const usage = data.usage || {};
        return {
          content: choice.message.content,
          model: data.model || this.model,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0
          },
          duration: Date.now() - startTime
        };
      } catch (error) {
        logger.warn(`AI request failed (attempt ${attempt + 1}/${this.maxRetries}): ${error.message}`);
        if (attempt < this.maxRetries - 1) await this.sleep(this.retryDelay * (attempt + 1));
        else throw this.handleError(error);
      }
    }
  }

  async analyzeTicket(ticketData, analysisType) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt(analysisType) },
      { role: 'user', content: this.buildTicketPrompt(ticketData, analysisType) }
    ];
    return this.chat(messages, { temperature: 0.3, maxTokens: 2000 });
  }

  getSystemPrompt(analysisType) {
    const prompts = {
      root_cause: 'You are an expert Sage 300 support analyst. Identify the likely root cause and cite clues from the ticket.',
      solution: 'You are an expert Sage 300 support specialist. Provide a practical, numbered resolution procedure.',
      search_plan: 'You are a Sage support researcher. Return several concise search queries for relevant documentation.'
    };
    return prompts[analysisType] || prompts.root_cause;
  }

  buildTicketPrompt(ticketData, analysisType) {
    return `Ticket ID: ${ticketData.ticketId || ''}\nSubject: ${ticketData.subject || ''}\nDescription: ${ticketData.description || ''}\n\nProvide a detailed ${String(analysisType).replace(/_/g, ' ')} analysis.`;
  }

  handleError(error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'AI request failed';
    logger.error(`AI Error [${status}]: ${message}`);
    const normalized = new Error(message);
    normalized.status = status;
    return normalized;
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

module.exports = OpenAIProvider;
