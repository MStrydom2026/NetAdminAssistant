const logger = require('../utils/logger');

const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
const selectedProvider = explicitProvider || (process.env.OPENAI_API_KEY ? 'openai' : 'azure');

const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  aiProvider: selectedProvider,
  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },
  db: {
    path: process.env.DB_PATH || './data/netadmin-assistant.db',
    enableJournal: process.env.DB_ENABLE_JOURNAL === 'true'
  },
  features: {
    localAnalysis: process.env.ENABLE_LOCAL_ANALYSIS !== 'false',
    attachmentProcessing: process.env.ENABLE_ATTACHMENT_PROCESSING === 'true',
    ticketCaching: process.env.ENABLE_TICKET_CACHING !== 'false'
  },
  api: {
    requestTimeoutMs: Number.parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '60000', 10),
    maxRetries: Number.parseInt(process.env.AI_MAX_RETRIES || '2', 10),
    retryDelayMs: Number.parseInt(process.env.AI_RETRY_DELAY_MS || '1000', 10)
  },
  security: {
    allowLocalhostOnly: process.env.ALLOW_LOCALHOST_ONLY !== 'false',
    corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean)
  }
};

function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!['azure', 'openai', 'mock'].includes(config.aiProvider)) {
    errors.push(`Invalid AI_PROVIDER: ${config.aiProvider}`);
  }

  if (config.aiProvider === 'azure' && (!config.azure.apiKey || !config.azure.endpoint || !config.azure.deploymentName)) {
    warnings.push('Azure OpenAI is not fully configured.');
  }

  if (config.aiProvider === 'openai' && config.openai.baseURL.includes('api.openai.com') && !config.openai.apiKey) {
    warnings.push('OPENAI_API_KEY is required when using the public OpenAI endpoint.');
  }

  if (config.aiProvider === 'openai' && !config.openai.baseURL.includes('api.openai.com')) {
    logger.info(`Using OpenAI-compatible local endpoint: ${config.openai.baseURL}`);
  }

  warnings.forEach(warning => logger.warn(`Config: ${warning}`));
  if (errors.length) throw new Error(`Configuration errors: ${errors.join('; ')}`);
  return true;
}

function isAIConfigured() {
  if (config.aiProvider === 'mock') return true;
  if (config.aiProvider === 'openai') {
    return Boolean(config.openai.baseURL) && (!config.openai.baseURL.includes('api.openai.com') || Boolean(config.openai.apiKey));
  }
  if (config.aiProvider === 'azure') {
    return Boolean(config.azure.apiKey && config.azure.endpoint && config.azure.deploymentName);
  }
  return false;
}

function getAIProvider() {
  if (config.aiProvider === 'azure') {
    const Provider = require('../services/providers/azureOpenAI');
    return new Provider(config.azure);
  }
  if (config.aiProvider === 'openai') {
    const Provider = require('../services/providers/openai');
    return new Provider(config.openai);
  }
  if (config.aiProvider === 'mock') {
    const Provider = require('../services/providers/mock');
    return new Provider();
  }
  throw new Error(`Unknown AI provider: ${config.aiProvider}`);
}

module.exports = { config, validateConfig, getAIProvider, isAIConfigured };
