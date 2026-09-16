# Development Setup Guide

## Prerequisites

- **Node.js:** v16+ (LTS recommended)
- **Chrome/Chromium:** v90+
- **Azure OpenAI API Key** (or use Mock provider)
- **Git:** for version control

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/MStrydom2026/NetAdminAssistant.git
cd NetAdminAssistant
```

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```env
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-org.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
```

Start the server:

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════╗
║   NetAdmin Assistant Backend Started           ║
║          Listening on port 3000                ║
║        Environment: development                ║
╚════════════════════════════════════════════════╝
```

### 3. Chrome Extension Setup

1. Open **Chrome Extensions**: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `extension` folder from this repo

You should see the extension appear in your extensions list with a green icon.

### 4. Test Everything

**Backend Health:**
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "NetAdmin Assistant Backend",
  "version": "0.5.3",
  "aiProvider": "azure"
}
```

**Extension:**
1. Navigate to a NetAdmin ticket page
2. Look for the green 🔍 floating button (bottom-right)
3. Click it → analysis panel opens
4. Click "Analyze" → should process and display results

## Development Workflow

### Running in Development

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Chrome:**
- Open `chrome://extensions/`
- Enable Developer Mode
- Click Reload on NetAdmin Assistant
- Open DevTools (F12) to see console logs

### Making Changes

**Backend Code:**
- Changes auto-reload with `nodemon`
- Check terminal for errors
- Restart if needed: Ctrl+C, then `npm run dev`

**Extension Code:**
- Edit `.js` or `.css` files
- Click Reload button in `chrome://extensions/`
- Refresh the webpage

### Database

View the SQLite database:
```bash
sqlite3 data/netadmin-assistant.db

# Common queries
.tables                    # List all tables
SELECT * FROM tickets;     # View analyzed tickets
SELECT * FROM analyses;    # View analysis results
```

### Testing with Mock Provider

To test without Azure OpenAI:

```bash
# In server/.env
AI_PROVIDER=mock

# Restart server
npm run dev
```

Now responses are simulated locally (no API calls).

## Debugging

### Backend Logs

Logs appear in console with color-coding:
- 🔴 **ERROR** - Red
- 🟡 **WARN** - Yellow  
- 🔵 **INFO** - Cyan
- 🟣 **DEBUG** - Magenta (if `LOG_LEVEL=debug`)

### Extension Debugging

1. Open Chrome DevTools (F12)
2. Go to **Console** tab
3. Look for `[NetAdmin Assistant]` prefixed logs
4. Check **Network** tab for API calls
5. Check **Application** → **Storage** → **Local Storage** for cache

### API Testing

**Postman Collection:**
```bash
# Save this as netadmin-assistant.postman_collection.json
```

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Analyze Ticket:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "TEST001",
    "subject": "Test Ticket",
    "description": "This is a test"
  }'
```

**Get History:**
```bash
curl http://localhost:3000/api/history/tickets
```

## Common Issues

### Port 3000 Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Azure OpenAI Connection Failed

1. Check `.env` file - is it in `server/` directory?
2. Verify `AZURE_OPENAI_API_KEY` is not empty
3. Verify endpoint URL ends with `/`
4. Check network connectivity
5. Fall back to Mock: `AI_PROVIDER=mock`

### Extension Not Loading

```bash
# Check Chrome version
# Open chrome://version/

# If error in manifest, check:
# 1. JSON syntax is valid
# 2. All referenced files exist
# 3. Open chrome://extensions/ - look at "Details" for error
```

### Ticket Not Scraping

The content script uses generic selectors. If NetAdmin uses different DOM structure:

1. Open DevTools on ticket page (F12)
2. Find the actual selectors:
   - Right-click ticket ID → Inspect
   - Note the element's class/id
3. Edit `extension/content.js`
4. Update selectors in `scrapeCurrentTicket()` function
5. Reload extension

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|----------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (dev/prod) | development |
| `LOG_LEVEL` | Logging verbosity | info |
| `AI_PROVIDER` | AI backend (azure/openai/mock) | azure |
| `AZURE_OPENAI_API_KEY` | Azure API key | - |
| `AZURE_OPENAI_ENDPOINT` | Azure endpoint URL | - |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment name | - |
| `DB_PATH` | SQLite database path | ./data/netadmin-assistant.db |
| `ENABLE_LOCAL_ANALYSIS` | Enable fallback | true |
| `ENABLE_ATTACHMENT_PROCESSING` | Process files | true |
| `ENABLE_TICKET_CACHING` | Cache results | true |
| `MAX_CACHE_AGE_HOURS` | Cache TTL | 24 |

## Next Steps

1. ✅ Start backend server
2. ✅ Load Chrome extension
3. ✅ Test on a NetAdmin ticket page
4. 📝 Read [API Documentation](docs/API.md)
5. 📚 Review [Architecture](docs/ARCHITECTURE.md)
6. 🔧 Customize selectors for your NetAdmin instance
7. 🚀 Deploy to production

## Support

For issues:
1. Check this guide first
2. Review backend logs in terminal
3. Check extension console (DevTools)
4. Open an issue on GitHub

---

**Last Updated:** 2026-09-16
**Version:** 0.5.3
