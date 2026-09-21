const API_BASE_URL = 'http://127.0.0.1:3000';

document.addEventListener('DOMContentLoaded', async () => {
  await updateBackendStatus();
  document.getElementById('analyzeBtn')?.addEventListener('click', analyzeCurrentTicket);
  document.getElementById('clearCacheBtn')?.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'clearCache' }, () => alert('Cache cleared')));
});

async function getBackendStatus() {
  const health = await fetch(`${API_BASE_URL}/health`);
  if (health.ok) return await health.json();
  const root = await fetch(`${API_BASE_URL}/`);
  const data = await root.json();
  if (!root.ok || data.status !== 'ok') throw new Error(`Backend returned HTTP ${root.status}`);
  return data;
}

async function updateBackendStatus() {
  const status = document.getElementById('backendStatus');
  try {
    const data = await getBackendStatus();
    status.className = 'status-indicator healthy';
    const model = data.model ? ` · ${data.model}` : '';
    status.textContent = `✅ Backend connected${model}`;
  } catch (error) {
    status.className = 'status-indicator error';
    status.textContent = `❌ Backend unavailable at ${API_BASE_URL}`;
  }
}

async function analyzeCurrentTicket() {
  const container = document.getElementById('results');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return showError(container, 'Could not identify the active tab.');
  chrome.tabs.sendMessage(tab.id, { action: 'scrapeTicket' }, response => {
    if (chrome.runtime.lastError) return showError(container, 'Refresh the NetAdmin page and try again.');
    if (response?.success) analyzeAndDisplay(response.data, container);
    else showError(container, response?.error || 'Could not read the ticket.');
  });
}

function analyzeAndDisplay(ticketData, container) {
  container.innerHTML = '<div class="loading">Analyzing ticket…</div>';
  chrome.runtime.sendMessage({ action: 'analyze', data: ticketData }, response => {
    if (response?.success) renderAnalysis(response.data, response.fromCache, container);
    else showError(container, response?.error || 'Analysis failed.');
  });
}

function showError(container, message) { container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`; }
function renderAnalysis(data, fromCache, container) {
  const analysis = data.analysis || {};
  const rootCause = analysis.rootCause || { confidence: 0, content: '' };
  const solution = analysis.solution || { content: '' };
  const searchResults = analysis.searchResults || [];
  let html = `<div class="analysis-header"><h2>${escapeHtml(data.ticketId)}</h2>${fromCache ? '<span class="badge cache">Cached</span>' : ''}<p class="metadata">Analysis time: ${data.duration || 0}ms</p></div>`;
  html += `<div class="analysis-section root-cause"><h3>🔍 Root Cause Analysis</h3><div class="confidence-bar" style="width:${Math.max(0, Math.min(100, (rootCause.confidence || 0) * 100))}%"></div><p class="confidence-text">Confidence: ${Math.round((rootCause.confidence || 0) * 100)}%</p><div class="content">${escapeHtml(rootCause.content)}</div></div>`;
  html += `<div class="analysis-section solution"><h3>✅ Recommended Solution</h3><div class="content">${escapeHtml(solution.content)}</div></div>`;
  html += '<div class="analysis-section search"><h3>🔎 Knowledge Base Search</h3><div class="content">';
  html += searchResults.map(result => `<div class="search-query"><strong>${escapeHtml(result.query)}</strong></div>`).join('') || 'No search results available.';
  container.innerHTML = `${html}</div>`;
}
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value == null ? '' : String(value); return div.innerHTML; }
