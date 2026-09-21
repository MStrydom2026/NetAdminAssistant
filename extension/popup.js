const apiUrl = 'http://127.0.0.1:3000';

document.addEventListener('DOMContentLoaded', updateBackendStatus);
async function updateBackendStatus() {
  const statusDiv = document.getElementById('backendStatus');
  if (!statusDiv) return;
  try {
    let response = await fetch(`${apiUrl}/health`);
    let data;
    if (response.ok) data = await response.json();
    else { response = await fetch(`${apiUrl}/`); data = await response.json(); }
    if (!response.ok || data.status !== 'ok' && data.status !== 'healthy') throw new Error('Backend unavailable');
    statusDiv.textContent = `✅ Backend connected${data.model ? ` · ${data.model}` : ''}`;
    statusDiv.className = 'status-indicator healthy';
  } catch { statusDiv.textContent = `❌ Backend unavailable at ${apiUrl}`; statusDiv.className = 'status-indicator error'; }
}
