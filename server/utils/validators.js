/**
 * Input validation utilities
 */

const Joi = require('joi');

// Schemas for common request bodies
const schemas = {
  analyzeTicket: Joi.object({
    ticketId: Joi.string().required().description('NetAdmin ticket ID'),
    subject: Joi.string().required().description('Ticket subject'),
    description: Joi.string().required().description('Ticket description/body'),
    attachments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        content: Joi.string().required(),
        url: Joi.string().optional()
      })
    ).optional(),
    metadata: Joi.object().optional()
  }),

  searchQuery: Joi.object({
    query: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(10).default(5)
  }),

  historyQuery: Joi.object({
    ticketId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  })
};

/**
 * Validate request body against schema
 * @param {Object} data - Data to validate
 * @param {String} schemaName - Name of schema to use
 * @returns {Object} { error, value }
 */
function validate(data, schemaName) {
  if (!schemas[schemaName]) {
    return { error: `Unknown schema: ${schemaName}`, value: null };
  }
  return schemas[schemaName].validate(data, { abortEarly: false });
}

module.exports = {
  validate,
  schemas
};
