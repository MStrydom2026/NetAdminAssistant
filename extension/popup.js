/**
 * Popup Script
 * Quick access UI for analysis
 */

const apiUrl = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const historyBtn = document.getElementById('historyBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const statusDiv = document.getElementById('status');
  const resultsDiv = document.getElementById('results');

  // Check backend status
  await updateBackendStatus();

  // Analyze button
  analyzeBtn?.addEventListener('click', async () => {
    statusDiv.textContent = 'Scraping ticket...';
    resultsDiv.innerHTML = '';

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Request ticket scrape from content script
      chrome.tabs.sendMessage(
        tab.id,
        { action: 'scrapeTicket' },
        async (response) => {
          if (response.success) {
            statusDiv.textContent = 'Analyzing ticket...';
            const result = await analyzeTicket(response.data);
            displayResults(result);
          } else {
            statusDiv.textContent = 'Failed to scrape ticket';
          }
        }
      );
    } catch (error) {
      statusDiv.textContent = `Error: ${error.message}`;
    }
  });

  // History button
  historyBtn?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage?.();
  });

  // Settings button
  settingsBtn?.addEventListener('click', () => {
    // Open settings page
    chrome.tabs.create({ url: 'html/options.html' });
  });
});

async function updateBackendStatus() {
  const statusDiv = document.getElementById('backendStatus');
  if (!statusDiv) return;

  try {
    const response = await fetch(`${apiUrl}/health`, { timeout: 5000 });
    if (response.ok) {
      statusDiv.textContent = '✅ Backend connected';
      statusDiv.style.color = '#00a651';
    } else {
      statusDiv.textContent = '❌ Backend unavailable';
      statusDiv.style.color = '#d32f2f';
    }
  } catch (error) {
    statusDiv.textContent = '❌ Backend offline';
    statusDiv.style.color = '#d32f2f';
  }
}

async function analyzeTicket(ticketData) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'analyze', data: ticketData },
      (response) => {
        resolve(response);
      }
    );
  });
}

function displayResults(result) {
  const resultsDiv = document.getElementById('results');
  const statusDiv = document.getElementById('status');

  if (!result.success) {
    statusDiv.textContent = `Analysis failed: ${result.error}`;
    return;
  }

  const { data } = result;
  const { analysis } = data;

  resultsDiv.innerHTML = `
    <div class="result-section">
      <h3>Root Cause</h3>
      <p>${analysis.rootCause.content}</p>
      <div class="confidence">Confidence: ${(analysis.rootCause.confidence * 100).toFixed(0)}%</div>
    </div>
    <div class="result-section">
      <h3>Solution</h3>
      <p>${analysis.solution.content}</p>
    </div>
    <div class="result-section">
      <h3>Search Results</h3>
      ${analysis.searchResults.map(r => `
        <div class="search-result">
          <strong>${r.query}</strong>
          ${r.results.kb?.results?.slice(0, 2).map(item => `
            <div><a href="${item.url}" target="_blank">${item.title}</a></div>
          `).join('') || '<p>No results</p>'}
        </div>
      `).join('')}
    </div>
  `;

  statusDiv.textContent = `Analysis completed in ${data.duration}ms`;
}
