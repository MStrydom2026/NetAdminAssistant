const API_BASE_URL = 'http://127.0.0.1:3000';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    apiUrl: API_BASE_URL,
    analysisCache: {},
    settings: { autoAnalyze: true, showConfidence: true, cacheEnabled: true, maxCacheAge: CACHE_DURATION }
  });
  checkBackendHealth();
});

async function fetchBackendStatus() {
  const health = await fetch(`${API_BASE_URL}/health`);
  if (health.ok) return { response: health, data: await health.json(), endpoint: '/health' };

  // The server currently running from netadmin-ai-helper exposes its status at `/`.
  const root = await fetch(`${API_BASE_URL}/`);
  const data = await root.json();
  if (!root.ok || data.status !== 'ok') throw new Error(`Backend returned HTTP ${root.status}`);
  return { response: root, data, endpoint: '/' };
}

async function checkBackendHealth() {
  try {
    const { data } = await fetchBackendStatus();
    chrome.storage.local.set({ backendStatus: 'healthy', backendHealth: data });
  } catch (error) {
    chrome.storage.local.set({ backendStatus: 'unavailable', backendHealth: { error: error.message } });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') { handleAnalyze(request.data, sendResponse); return true; }
  if (request.action === 'getHistory') { handleGetHistory(request.data || {}, sendResponse); return true; }
  if (request.action === 'getSettings') { chrome.storage.local.get('settings', result => sendResponse({ success: true, settings: result.settings })); return true; }
  if (request.action === 'saveSettings') { chrome.storage.local.set({ settings: request.data }, () => sendResponse({ success: true })); return true; }
  if (request.action === 'clearCache') { chrome.storage.local.set({ analysisCache: {} }, () => sendResponse({ success: true })); return true; }
  if (request.action === 'checkBackend') { checkBackendHealth().then(() => sendResponse({ success: true })); return true; }
  if (request.action === 'openSidePanel') {
    if (sender.tab?.windowId && chrome.sidePanel?.open) chrome.sidePanel.open({ windowId: sender.tab.windowId }).then(() => sendResponse({ success: true })).catch(error => sendResponse({ success: false, error: error.message }));
    else sendResponse({ success: false, error: 'Side panel API unavailable.' });
    return true;
  }
  sendResponse({ success: false, error: 'Unknown action' });
});

async function handleAnalyze(data, sendResponse) {
  try {
    const cached = await getCachedAnalysis(data.ticketId);
    if (cached) return sendResponse({ success: true, data: cached, fromCache: true });
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, attachments: data.attachments || [] })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || `API error: ${response.status}`);
    await cacheAnalysis(data.ticketId, result);
    sendResponse({ success: true, data: result, fromCache: false });
  } catch (error) { sendResponse({ success: false, error: error.message }); }
}

async function handleGetHistory({ limit = 20, offset = 0 }, sendResponse) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history/tickets?limit=${limit}&offset=${offset}`);
    sendResponse({ success: response.ok, data: await response.json() });
  } catch (error) { sendResponse({ success: false, error: error.message }); }
}

function cacheAnalysis(ticketId, result) {
  return new Promise(resolve => chrome.storage.local.get('analysisCache', data => {
    const cache = data.analysisCache || {};
    cache[ticketId] = { data: result, timestamp: Date.now() };
    chrome.storage.local.set({ analysisCache: cache }, resolve);
  }));
}

function getCachedAnalysis(ticketId) {
  return new Promise(resolve => chrome.storage.local.get(['analysisCache', 'settings'], data => {
    const cached = data.analysisCache?.[ticketId];
    const maxAge = data.settings?.maxCacheAge || CACHE_DURATION;
    resolve(cached && Date.now() - cached.timestamp < maxAge ? cached.data : null);
  }));
}

setInterval(checkBackendHealth, 5 * 60 * 1000);
