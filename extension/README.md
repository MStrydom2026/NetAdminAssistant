# NetAdmin Assistant Chrome Extension

## Installation

### For Development

1. **Load the extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `extension` folder from this repository

2. **Ensure backend is running:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Test the extension:**
   - Navigate to any NetAdmin ticket page
   - Click the green 🔍 floating button
   - Or click the extension icon and select "Analyze Ticket"

### For Production

1. Package the extension:
   ```bash
   # Create a .crx file for distribution
   # Use Chrome extension packing in chrome://extensions/
   ```

2. Deploy to Chrome Web Store (requires developer account)

## Features

✅ **Ticket Analysis**
- Root cause identification
- Solution recommendations  
- Confidence scoring
- Evidence extraction

✅ **Knowledge Base Integration**
- Sage KB search
- Community forum lookup
- Documentation discovery

✅ **Caching & Performance**
- 24-hour cache for analyzed tickets
- Offline mode support
- Quick access to recent analyses

✅ **UI/UX**
- Dark theme (Sage green accents)
- Floating action button
- Side panel for detailed analysis
- Popup for quick access

## Configuration

Backend API URL is hardcoded to `http://localhost:3000`

To change:
1. Edit `background.js` line 1: `const API_BASE_URL = '...'`
2. Edit `popup.js` line 1: `const apiUrl = '...'`
3. Edit `sidepanel.js` line 1: `const API_BASE_URL = '...'`

## Troubleshooting

### Backend connection failed
- Ensure server is running on port 3000
- Check `chrome://extensions/` -> Extension Details -> Errors
- Open DevTools (F12) and check console for errors

### Ticket not scraping
- Verify you're on a NetAdmin ticket page
- Check content script selector matches your NetAdmin DOM
- Edit selectors in `content.js` function `scrapeCurrentTicket()`

### Analysis taking too long
- Check backend logs for Azure OpenAI connection issues
- Try using Mock provider: set `AI_PROVIDER=mock` in `.env`
- Increase timeout in `background.js`: `timeout: 60000`

## Development

### File Structure
```
extension/
├── manifest.json          # Extension config
├── background.js          # Service worker
├── content.js             # Page scraper
├── popup.js               # Popup UI logic
├── sidepanel.js           # Side panel logic
├── html/
│   ├── popup.html
│   └── sidepanel.html
├── styles/
│   ├── common.css
│   ├── popup.css
│   └── sidepanel.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key APIs Used

**Chrome Extension APIs:**
- `chrome.runtime.onMessage` - Inter-component communication
- `chrome.storage.local` - Persistent caching
- `chrome.tabs.sendMessage` - Content script communication
- `chrome.sidePanel` - Side panel management

**Backend APIs:**
- `POST /api/analyze` - Ticket analysis
- `GET /api/history/tickets` - Ticket history
- `GET /health` - Health check

## Future Enhancements

- [ ] Support Sage CRM in addition to NetAdmin
- [ ] Offline mode with cached KB
- [ ] Real-time ticket status sync
- [ ] Interactive feedback loop (mark solutions as effective)
- [ ] Custom KB indexing
- [ ] Multi-language support
- [ ] Mobile companion app
