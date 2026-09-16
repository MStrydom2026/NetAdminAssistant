/**
 * Configuration Management
 * Centralizes all environment and app configuration
 */

const logger = require('../utils/logger');

const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // AI Provider
  aiProvider: (process.env.AI_PROVIDER || 'azure').toLowerCase(),
  
  // Azure OpenAI
  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
  },

  // OpenAI (fallback)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo'
  },

  // Database
  db: {
    path: process.env.DB_PATH || './data/netadmin-assistant.db',
    enableJournal: process.env.DB_ENABLE_JOURNAL === 'true'
  },

  // Features
  features: {
    localAnalysis: process.env.ENABLE_LOCAL_ANALYSIS === 'true',
    attachmentProcessing: process.env.ENABLE_ATTACHMENT_PROCESSING === 'true',
    ticketCaching: process.env.ENABLE_TICKET_CACHING === 'true',
    maxCacheAgeHours: parseInt(process.env.MAX_CACHE_AGE_HOURS || '24', 10)
  },

  // API Settings
  api: {
    requestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '30000', 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.AI_RETRY_DELAY_MS || '1000', 10)
  },

  // Security
  security: {
    allowLocalhostOnly: process.env.ALLOW_LOCALHOST_ONLY === 'true',
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*']
  }
};

/**
 * Validate configuration
 * @throws {Error} If critical configuration is missing
 */
function validateConfig() {
  const errors = [];
  const warnings = [];

  // Validate AI Provider
  if (!['azure', 'openai', 'mock'].includes(config.aiProvider)) {
    errors.push(`Invalid AI_PROVIDER: ${config.aiProvider}. Must be 'azure', 'openai', or 'mock'.`);
  }

  // Validate Azure credentials if provider is Azure
  if (config.aiProvider === 'azure') {
    if (!config.azure.apiKey) {
      warnings.push('AZURE_OPENAI_API_KEY not set. Azure OpenAI features will be unavailable.');
    }
    if (!config.azure.endpoint) {
      warnings.push('AZURE_OPENAI_ENDPOINT not set. Azure OpenAI features will be unavailable.');
    }
    if (!config.azure.deploymentName) {
      warnings.push('AZURE_OPENAI_DEPLOYMENT_NAME not set. Azure OpenAI features will be unavailable.');
    }
  }

  // Validate OpenAI credentials if provider is OpenAI
  if (config.aiProvider === 'openai') {
    if (!config.openai.apiKey) {
      warnings.push('OPENAI_API_KEY not set. OpenAI features will be unavailable.');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join('; ')}`);
  }

  if (warnings.length > 0) {
    warnings.forEach(w => logger.warn(`Config: ${w}`));
  }

  return true;
}

/**
 * Get AI Provider Instance
 */
function getAIProvider() {
  const provider = config.aiProvider;
  
  if (provider === 'azure') {
    const AzureProvider = require('../services/providers/azureOpenAI');
    return new AzureProvider(config.azure);
  } else if (provider === 'openai') {
    const OpenAIProvider = require('../services/providers/openai');
    return new OpenAIProvider(config.openai);
  } else if (provider === 'mock') {
    const MockProvider = require('../services/providers/mock');
    return new MockProvider();
  }
  
  throw new Error(`Unknown AI provider: ${provider}`);
}

module.exports = {
  config,
  validateConfig,
  getAIProvider
};
