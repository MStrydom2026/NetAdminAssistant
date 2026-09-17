const logger = require('../utils/logger');

const explicitProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
const selectedProvider = explicitProvider || (process.env.OPENAI_API_KEY ? 'openai' : 'azure');
const config = {
  port: process.env.PORT || 3000, nodeEnv: process.env.NODE_ENV || 'development', logLevel: process.env.LOG_LEVEL || 'info', aiProvider: selectedProvider,
  azure: { apiKey: process.env.AZURE_OPENAI_API_KEY, endpoint: process.env.AZURE_OPENAI_ENDPOINT, deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME, apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
  openai: { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
  db: { path: process.env.DB_PATH || './data/netadmin-assistant.db', enableJournal: process.env.DB_ENABLE_JOURNAL === 'true' },
  features: { localAnalysis: process.env.ENABLE_LOCAL_ANALYSIS === 'true', attachmentProcessing: process.env.ENABLE_ATTACHMENT_PROCESSING === 'true', ticketCaching: process.env.ENABLE_TICKET_CACHING === 'true', maxCacheAgeHours: parseInt(process.env.MAX_CACHE_AGE_HOURS || '24', 10) },
  api: { requestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '30000', 10), maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10), retryDelayMs: parseInt(process.env.AI_RETRY_DELAY_MS || '1000', 10) },
  security: { allowLocalhostOnly: process.env.ALLOW_LOCALHOST_ONLY === 'true', corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'] }
};
function validateConfig() {
  const errors = []; const warnings = [];
  if (!['azure', 'openai', 'mock'].includes(config.aiProvider)) errors.push(`Invalid AI_PROVIDER: ${config.aiProvider}`);
  if (config.aiProvider === 'azure' && (!config.azure.apiKey || !config.azure.endpoint || !config.azure.deploymentName)) warnings.push('Azure OpenAI is not fully configured.');
  if (config.aiProvider === 'openai' && !config.openai.apiKey) warnings.push('OPENAI_API_KEY not set. Add it to server/.env and restart the server.');
  warnings.forEach(w => logger.warn(`Config: ${w}`));
  if (errors.length) throw new Error(`Configuration errors: ${errors.join('; ')}`);
  return true;
}
function isAIConfigured() { return config.aiProvider === 'mock' || (config.aiProvider === 'openai' ? Boolean(config.openai.apiKey) : Boolean(config.azure.apiKey && config.azure.endpoint && config.azure.deploymentName)); }
function getAIProvider() {
  if (config.aiProvider === 'azure') { const Provider = require('../services/providers/azureOpenAI'); return new Provider(config.azure); }
  if (config.aiProvider === 'openai') { const Provider = require('../services/providers/openai'); return new Provider(config.openai); }
  if (config.aiProvider === 'mock') { const Provider = require('../services/providers/mock'); return new Provider(); }
  throw new Error(`Unknown AI provider: ${config.aiProvider}`);
}
module.exports = { config, validateConfig, getAIProvider, isAIConfigured };
