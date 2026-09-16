/**
 * Side Panel Script
 * Detailed analysis UI
 */

const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[NetAdmin Assistant] Side panel loaded');

  const analyzeBtn = document.getElementById('analyzeBtn');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  const resultsContainer = document.getElementById('results');

  // Analyze button
  analyzeBtn?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(
      tab.id,
      { action: 'scrapeTicket' },
      async (response) => {
        if (response?.success) {
          await analyzeAndDisplay(response.data, resultsContainer);
        }
      }
    );
  });

  // Clear cache button
  clearCacheBtn?.addEventListener('click', async () => {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'clearCache' },
        resolve
      );
    });
    alert('Cache cleared');
  });
});

async function analyzeAndDisplay(ticketData, container) {
  container.innerHTML = '<div class="loading">Analyzing ticket...</div>';

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'analyze', data: ticketData },
      (response) => {
        if (response.success) {
          renderAnalysis(response.data, response.fromCache, container);
        } else {
          container.innerHTML = `<div class="error">Error: ${response.error}</div>`;
        }
        resolve();
      }
    );
  });
}

function renderAnalysis(data, fromCache, container) {
  const { analysis, duration } = data;
  const { rootCause, solution, searchResults } = analysis;

  let html = `
    <div class="analysis-header">
      <h2>${data.ticketId}</h2>
      ${fromCache ? '<span class="badge cache">Cached</span>' : ''}
      <p class="metadata">Analysis time: ${duration}ms</p>
    </div>

    <div class="analysis-section root-cause">
      <h3>🔍 Root Cause Analysis</h3>
      <div class="confidence-bar" style="width: ${rootCause.confidence * 100}%"></div>
      <p class="confidence-text">Confidence: ${(rootCause.confidence * 100).toFixed(0)}%</p>
      <div class="content">${escapeHtml(rootCause.content)}</div>
      ${rootCause.evidence?.length > 0 ? `
        <div class="evidence">
          <strong>Evidence:</strong>
          <ul>${rootCause.evidence.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>

    <div class="analysis-section solution">
      <h3>✅ Recommended Solution</h3>
      <div class="content">${escapeHtml(solution.content)}</div>
      ${solution.steps?.length > 0 ? `
        <ol class="steps">
          ${solution.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ol>
      ` : ''}
    </div>

    <div class="analysis-section search">
      <h3>🔎 Knowledge Base Search</h3>
  `;

  if (searchResults?.length > 0) {
    searchResults.forEach((result) => {
      html += `
        <div class="search-query">
          <strong>${escapeHtml(result.query)}</strong>
          <div class="search-sources">
      `;

      Object.entries(result.results).forEach(([source, sourceData]) => {
        if (sourceData?.results?.length > 0) {
          html += `
            <div class="source">
              <span class="source-name">${sourceData.source}</span>
              <ul>
          `;
          sourceData.results.slice(0, 3).forEach((item) => {
            html += `
              <li>
                <a href="${escapeHtml(item.url)}" target="_blank">
                  ${escapeHtml(item.title)}
                </a>
              </li>
            `;
          });
          html += `</ul></div>`;
        }
      });

      html += `</div></div>`;
    });
  } else {
    html += '<p>No search results available</p>';
  }

  html += `</div>`;

  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
