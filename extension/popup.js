const apiUrl = 'http://127.0.0.1:3000';

document.addEventListener('DOMContentLoaded', updateBackendStatus);
async function updateBackendStatus() {
  const status = document.getElementById('backendStatus');
  try { const response = await fetch(`${apiUrl}/health`); const data = await response.json(); status.textContent = response.ok ? `✅ Backend connected · ${data.aiProvider || 'AI provider'} ready` : `⚠️ ${data.aiMessage || 'Backend unhealthy'}`; status.className = `status-indicator ${response.ok ? 'healthy' : 'error'}`; }
  catch { status.textContent = `❌ Backend unavailable at ${apiUrl}`; status.className = 'status-indicator error'; }
}
