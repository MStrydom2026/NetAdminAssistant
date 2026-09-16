/**
 * Mock AI Provider
 * For testing without real API calls
 */

const logger = require('../../utils/logger');

class MockProvider {
  constructor() {
    logger.warn('Using Mock AI Provider - responses are simulated for testing only');
  }

  isConfigured() {
    return true;
  }

  async chat(messages, options = {}) {
    const delay = 1000 + Math.random() * 2000;
    await this.sleep(delay);

    const mockResponses = {
      'root_cause': 'Based on the ticket information, the likely root cause appears to be a configuration issue with module synchronization. The user may have incomplete module setup or missing prerequisite installations.',
      'solution': 'Steps to resolve:\n1. Verify all module prerequisites are installed\n2. Run the module initialization script\n3. Check system logs for errors\n4. Restart the affected service\n5. Test with sample data',
      'search_plan': 'Recommended search strategy:\n- Search Sage KB for "module configuration"\n- Check Community forums for similar issues\n- Review Sage documentation for version compatibility\n- Search for specific error messages'
    };

    const userContent = messages[messages.length - 1]?.content || '';
    let mockResponse;

    if (userContent.includes('root_cause')) {
      mockResponse = mockResponses.root_cause;
    } else if (userContent.includes('solution')) {
      mockResponse = mockResponses.solution;
    } else if (userContent.includes('search')) {
      mockResponse = mockResponses.search_plan;
    } else {
      mockResponse = 'This is a mock response from the test provider. Connect real API for production use.';
    }

    return {
      content: mockResponse,
      model: 'mock-gpt-test',
      usage: {
        promptTokens: Math.floor(Math.random() * 500),
        completionTokens: Math.floor(Math.random() * 300),
        totalTokens: Math.floor(Math.random() * 800)
      },
      duration: delay
    };
  }

  async analyzeTicket(ticketData, analysisType) {
    logger.debug(`Mock analysis: ${analysisType}`);
    return this.chat(
      [{ role: 'user', content: `Analyze ticket for ${analysisType}` }],
      { maxTokens: 1000 }
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MockProvider;
