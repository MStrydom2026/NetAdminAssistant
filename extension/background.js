/**
 * Background Service Worker
 * Handles extension initialization and message routing
 */

const API_BASE_URL = 'http://localhost:3000';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[NetAdmin Assistant] Extension installed/updated');
  
  // Set default storage values
  chrome.storage.local.set({
    apiUrl: API_BASE_URL,
    analysisCache: {},
    settings: {
      autoAnalyze: true,
      showConfidence: true,
      cacheEnabled: true,
      maxCacheAge: CACHE_DURATION
    }
  });

  // Check backend health
  checkBackendHealth();
});

/**
 * Check if backend is healthy
 */
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { timeout: 5000 });
    if (response.ok) {
      console.log('[NetAdmin Assistant] Backend is healthy');
      chrome.storage.local.set({ backendStatus: 'healthy' });
    }
  } catch (error) {
    console.warn('[NetAdmin Assistant] Backend not available:', error.message);
    chrome.storage.local.set({ backendStatus: 'unavailable' });
  }
}

/**
 * Message listener - handle requests from content/popup/sidepanel
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[NetAdmin Assistant] Message received:', request.action);

  switch (request.action) {
    case 'analyze':
      handleAnalyze(request.data, sendResponse);
      return true; // Keep channel open for async

    case 'getHistory':
      handleGetHistory(request.data, sendResponse);
      return true;

    case 'getSettings':
      chrome.storage.local.get('settings', (result) => {
        sendResponse({ success: true, settings: result.settings });
      });
      break;

    case 'saveSettings':
      chrome.storage.local.set({ settings: request.data }, () => {
        sendResponse({ success: true });
      });
      break;

    case 'clearCache':
      chrome.storage.local.set({ analysisCache: {} }, () => {
        sendResponse({ success: true });
      });
      break;

    case 'checkBackend':
      checkBackendHealth();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Handle ticket analysis request
 */
async function handleAnalyze(data, sendResponse) {
  try {
    const { ticketId, subject, description, attachments } = data;

    // Check cache first
    const cached = await getCachedAnalysis(ticketId);
    if (cached) {
      console.log('[NetAdmin Assistant] Returning cached analysis for:', ticketId);
      sendResponse({ success: true, data: cached, fromCache: true });
      return;
    }

    console.log('[NetAdmin Assistant] Analyzing ticket:', ticketId);

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ticketId,
        subject,
        description,
        attachments: attachments || []
      }),
      timeout: 60000
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Cache the result
      await cacheAnalysis(ticketId, result);
      sendResponse({ success: true, data: result, fromCache: false });
    } else {
      sendResponse({ success: false, error: result.error || 'Analysis failed' });
    }
  } catch (error) {
    console.error('[NetAdmin Assistant] Analysis error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle history retrieval
 */
async function handleGetHistory(data, sendResponse) {
  try {
    const { limit = 20, offset = 0 } = data;

    const response = await fetch(
      `${API_BASE_URL}/api/history/tickets?limit=${limit}&offset=${offset}`,
      { timeout: 10000 }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('[NetAdmin Assistant] History retrieval error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Cache analysis result
 */
async function cacheAnalysis(ticketId, result) {
  return new Promise((resolve) => {
    chrome.storage.local.get('analysisCache', (data) => {
      const cache = data.analysisCache || {};
      cache[ticketId] = {
        data: result,
        timestamp: Date.now()
      };
      chrome.storage.local.set({ analysisCache: cache }, resolve);
    });
  });
}

/**
 * Retrieve cached analysis
 */
async function getCachedAnalysis(ticketId) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['analysisCache', 'settings'], (data) => {
      const cache = data.analysisCache || {};
      const settings = data.settings || {};

      if (!settings.cacheEnabled) {
        resolve(null);
        return;
      }

      const cached = cache[ticketId];
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < (settings.maxCacheAge || CACHE_DURATION)) {
          resolve(cached.data);
          return;
        }
        // Expired cache
        delete cache[ticketId];
        chrome.storage.local.set({ analysisCache: cache });
      }

      resolve(null);
    });
  });
}

// Periodic health check (every 5 minutes)
setInterval(checkBackendHealth, 5 * 60 * 1000);
