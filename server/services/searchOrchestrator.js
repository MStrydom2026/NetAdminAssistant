/**
 * Search Orchestrator
 * Coordinates searches across Sage KB, community, and web
 */

const axios = require('axios');
const logger = require('../utils/logger');
const db = require('../db/init');
const { v4: uuidv4 } = require('uuid');

class SearchOrchestrator {
  constructor() {
    this.sources = {
      kb: { name: 'Sage KB', domain: 'help.sage.com', priority: 1 },
      community: { name: 'Sage Community', domain: 'community.sage.com', priority: 2 },
      documentation: { name: 'Sage Docs', domain: 'developer.sage.com', priority: 1 }
    };
    this.timeout = 10000;
  }

  /**
   * Execute search plan from AI analysis
   */
  async executeSearchPlan(queries, analysisData) {
    logger.info(`Executing search plan with ${queries.length} queries`);
    const results = [];

    for (const query of queries) {
      try {
        const result = await this.search(query);
        results.push({
          query,
          results: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.warn(`Search failed for query "${query}":`, error.message);
      }
    }

    return results;
  }

  /**
   * Execute a single search
   */
  async search(query) {
    logger.debug(`Searching for: ${query}`);

    // Check cache first
    const cached = this.getFromCache(query);
    if (cached) {
      logger.info(`Retrieved cached results for: ${query}`);
      return cached;
    }

    const results = {
      kb: await this.searchKB(query),
      community: await this.searchCommunity(query),
      documentation: await this.searchDocumentation(query)
    };

    // Cache results
    this.cacheResults(query, results);

    return results;
  }

  /**
   * Search Sage KB
   */
  async searchKB(query) {
    try {
      // This is a placeholder - actual implementation would use Sage KB API
      const response = await axios.get('https://help.sage.com/search', {
        params: { q: query },
        timeout: this.timeout
      });

      return this.parseKBResults(response.data);
    } catch (error) {
      logger.warn(`KB search failed:`, error.message);
      return this.getMockKBResults(query);
    }
  }

  /**
   * Search Sage Community
   */
  async searchCommunity(query) {
    try {
      const response = await axios.get('https://community.sage.com/search', {
        params: { q: query },
        timeout: this.timeout
      });

      return this.parseCommunityResults(response.data);
    } catch (error) {
      logger.warn(`Community search failed:`, error.message);
      return this.getMockCommunityResults(query);
    }
  }

  /**
   * Search Sage Documentation
   */
  async searchDocumentation(query) {
    try {
      const response = await axios.get('https://developer.sage.com/search', {
        params: { q: query },
        timeout: this.timeout
      });

      return this.parseDocResults(response.data);
    } catch (error) {
      logger.warn(`Documentation search failed:`, error.message);
      return this.getMockDocResults(query);
    }
  }

  /**
   * Parse KB search results
   */
  parseKBResults(data) {
    // Placeholder - parse actual response format
    return {
      source: 'kb',
      count: 0,
      results: [],
      message: 'KB search not yet fully integrated'
    };
  }

  /**
   * Parse community search results
   */
  parseCommunityResults(data) {
    return {
      source: 'community',
      count: 0,
      results: [],
      message: 'Community search not yet fully integrated'
    };
  }

  /**
   * Parse documentation search results
   */
  parseDocResults(data) {
    return {
      source: 'documentation',
      count: 0,
      results: [],
      message: 'Documentation search not yet fully integrated'
    };
  }

  /**
   * Mock results for demonstration
   */
  getMockKBResults(query) {
    return {
      source: 'kb',
      count: 3,
      results: [
        {
          title: `Sage 300 - ${query} Guide`,
          url: 'https://help.sage.com/article/12345',
          summary: `Learn how to work with ${query} in Sage 300.`,
          relevance: 0.95
        },
        {
          title: `Troubleshooting ${query} Issues`,
          url: 'https://help.sage.com/article/12346',
          summary: `Common issues and solutions related to ${query}.`,
          relevance: 0.87
        },
        {
          title: `${query} Configuration Reference`,
          url: 'https://help.sage.com/article/12347',
          summary: `Complete configuration guide for ${query}.`,
          relevance: 0.79
        }
      ]
    };
  }

  getMockCommunityResults(query) {
    return {
      source: 'community',
      count: 2,
      results: [
        {
          title: `Question: ${query} not working`,
          url: 'https://community.sage.com/t/12345',
          author: 'SageUser',
          replies: 5,
          relevance: 0.82
        },
        {
          title: `Best practices for ${query}`,
          url: 'https://community.sage.com/t/12346',
          author: 'SageExpert',
          replies: 12,
          relevance: 0.76
        }
      ]
    };
  }

  getMockDocResults(query) {
    return {
      source: 'documentation',
      count: 2,
      results: [
        {
          title: `${query} API Reference`,
          url: 'https://developer.sage.com/api/${query}',
          type: 'API',
          relevance: 0.88
        }
      ]
    };
  }

  /**
   * Get results from cache
   */
  getFromCache(query) {
    try {
      const result = db.queryOne(
        `SELECT results FROM search_cache 
         WHERE query = ? AND expires_at > datetime('now')
         LIMIT 1`,
        [query]
      );

      if (result) {
        return JSON.parse(result.results);
      }
    } catch (error) {
      logger.debug('Cache lookup failed:', error.message);
    }
    return null;
  }

  /**
   * Cache search results
   */
  cacheResults(query, results) {
    try {
      const id = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      db.insert('search_cache', {
        id,
        query,
        source: 'combined',
        results: JSON.stringify(results),
        result_count: Object.values(results).reduce((sum, r) => sum + (r.count || 0), 0),
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

      logger.debug(`Cached results for: ${query}`);
    } catch (error) {
      logger.warn('Failed to cache results:', error.message);
    }
  }
}

module.exports = new SearchOrchestrator();
