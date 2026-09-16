# NetAdmin Assistant v0.5.3

**AI-powered Sage 300 support ticket analyzer for NetAdmin & Sage CRM**

NetAdmin Assistant is a Chrome extension + backend service that uses Azure OpenAI to intelligently analyze support tickets, identify root causes, recommend solutions, and search relevant knowledge bases.

## 🚀 Quick Start

### Backend Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your Azure OpenAI credentials
npm run dev
```

Server runs on `http://localhost:3000`

### Chrome Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder
5. Visit a NetAdmin ticket page and click the green 🔍 button

## 📋 Features

### Current (v0.5.3)
✅ **Ticket Analysis**
- AI-powered root cause identification
- Automated solution recommendations
- Confidence scoring with evidence extraction
- Support for attachments (OCR, file extraction)

✅ **Knowledge Base Integration**
- Sage KB search
- Community forum lookup  
- Documentation discovery
- Search result caching

✅ **Data Management**
- SQLite database for ticket history
- 24-hour analysis caching
- API usage tracking
- Solution effectiveness feedback

✅ **User Experience**
- Dark theme with Sage green accents
- Floating action button for quick access
- Detailed side panel analysis view
- Popup for fast ticket review

### Planned (Future Releases)
📋 **Sage CRM Support** - Extend beyond NetAdmin
📋 **Offline Mode** - Cache KB for offline access
📋 **Ticket Clustering** - Group similar issues
📋 **Escalation Prediction** - Flag L2/L3 tickets early
📋 **Custom KB** - Build local embeddings database
📋 **PII Redaction** - Auto-mask sensitive data
📋 **Multi-language** - Support Afrikaans, Portuguese, etc.
📋 **Mobile Companion** - On-the-go ticket checking

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Browser (Chrome)                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │     NetAdmin Assistant Extension (Manifest V3)  │   │
│  │  • Floating button on ticket pages              │   │
│  │  • Side panel detailed view                     │   │
│  │  • Popup quick access                           │   │
│  │  • Local caching (24hr)                         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓ (HTTP/REST)
┌─────────────────────────────────────────────────────────┐
│              Backend Server (Node.js/Express)           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ API Routes                                      │   │
│  │ • POST /api/analyze - Ticket analysis           │   │
│  │ • GET /api/history/* - Ticket history           │   │
│  │ • GET /health - Status checks                   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Services                                        │   │
│  │ • TicketAnalyzer - Root cause & solutions       │   │
│  │ • AttachmentProcessor - File extraction/OCR     │   │
│  │ • SearchOrchestrator - KB research              │   │
│  │ • AI Provider Layer - Azure/OpenAI/Mock         │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Database (SQLite)                               │   │
│  │ • Tickets, Analyses, Attachments                │   │
│  │ • Search cache, Solutions, API usage            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓ (HTTPS)
┌─────────────────────────────────────────────────────────┐
│              External Services                          │
│  • Azure OpenAI API (gpt-4, gpt-4-turbo, gpt-35)       │
│  • Sage KB (help.sage.com)                              │
│  • Sage Community (community.sage.com)                  │
│  • Sage Docs (developer.sage.com)                       │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
NetAdminAssistant/
├── server/                          # Backend Node.js/Express
│   ├── server.js                   # Main app
│   ├── package.json                # Dependencies
│   ├── .env.example                # Config template
│   ├── SETUP.md                    # Server setup guide
│   ├── config/
│   │   └── config.js               # Configuration management
│   ├── services/
│   │   ├── ticketAnalyzer.js       # Core analysis logic
│   │   ├── attachmentProcessor.js  # File processing
│   │   ├── searchOrchestrator.js   # KB search
│   │   └── providers/
│   │       ├── azureOpenAI.js      # Azure OpenAI integration
│   │       ├── openai.js           # OpenAI fallback
│   │       └── mock.js             # Mock provider for testing
│   ├── routes/
│   │   ├── health.js               # Health checks
│   │   ├── analyze.js              # Analysis endpoints
│   │   └── history.js              # History & feedback
│   ├── db/
│   │   ├── init.js                 # Database setup
│   │   └── schema.sql              # Database schema
│   ├── utils/
│   │   ├── logger.js               # Logging utility
│   │   └── validators.js           # Input validation
│   └── middleware/
│       └── errorHandler.js         # Error handling
│
├── extension/                        # Chrome Extension
│   ├── manifest.json               # Manifest V3 config
│   ├── README.md                   # Extension guide
│   ├── background.js               # Service worker
│   ├── content.js                  # Page scraper
│   ├── popup.js                    # Popup logic
│   ├── sidepanel.js                # Side panel logic
│   ├── html/
│   │   ├── popup.html              # Popup UI
│   │   └── sidepanel.html          # Side panel UI
│   ├── styles/
│   │   ├── common.css              # Shared styles
│   │   ├── popup.css               # Popup styles
│   │   └── sidepanel.css           # Side panel styles
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── docs/
│   ├── API.md                      # API documentation
│   ├── ARCHITECTURE.md             # System design
│   └── SETUP.md                    # Installation guide
│
├── .gitignore
├── README.md                        # This file
└── LICENSE
```

## 🔧 Configuration

### Environment Variables (server/.env)

```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# AI Provider (azure, openai, mock)
AI_PROVIDER=azure

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-org.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Database
DB_PATH=./data/netadmin-assistant.db
DB_ENABLE_JOURNAL=true

# Features
ENABLE_LOCAL_ANALYSIS=true
ENABLE_ATTACHMENT_PROCESSING=true
ENABLE_TICKET_CACHING=true
MAX_CACHE_AGE_HOURS=24
```

## 📚 API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed status with stats
- `GET /health/ready` - Readiness probe

### Analysis
- `POST /api/analyze` - Analyze single ticket
- `POST /api/analyze/batch` - Analyze multiple tickets (max 10)
- `POST /api/analyze/search` - Execute search queries

### History
- `GET /api/history/tickets` - Ticket history
- `GET /api/history/tickets/:ticketId` - Ticket details
- `GET /api/history/analyses/:ticketId` - Ticket analyses
- `POST /api/history/feedback` - Submit feedback
- `GET /api/history/stats` - Statistics

## 🧪 Testing

### Using Mock Provider (No API Keys Needed)

```bash
cd server
echo "AI_PROVIDER=mock" >> .env
npm run dev
```

### Test Endpoint

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "TKT001",
    "subject": "Module installation error",
    "description": "Getting error when installing module",
    "metadata": {"priority": "high"}
  }'
```

## 🔐 Security

✅ **Current**
- Local processing - no ticket data sent to external services (except Sage KB)
- Azure OpenAI API key stored in `.env` (not in code)
- HTTPS for all Sage service calls
- SQLite database local to machine

⚠️ **Future**
- [ ] PII redaction before analysis
- [ ] Audit trail for all analyses
- [ ] Encryption for local storage
- [ ] GDPR compliance features

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Reinitialize database
rm data/netadmin-assistant.db
npm run dev
```

### Extension not connecting
- Check backend status: `GET http://localhost:3000/health`
- Verify `.env` has correct API credentials
- Check Chrome DevTools (F12) for JavaScript errors
- Reload extension: `chrome://extensions/` → Reload button

### Azure OpenAI errors
- Verify API key is correct
- Check endpoint URL format (should end with `/`)
- Confirm deployment name exists
- Check quota hasn't been exceeded

### Analysis taking too long
- Increase timeout in `background.js`
- Try Mock provider: `AI_PROVIDER=mock`
- Check Azure service status

## 📈 Performance

- **Ticket scraping:** <100ms
- **Analysis (Azure):** 3-8 seconds
- **Search queries:** 1-3 seconds per source
- **Database:** <50ms per query
- **Memory usage:** ~50MB baseline + cache

## 🤝 Contributing

Branch: `development`

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open Pull Request to `development`

## 📝 Changelog

### v0.5.3
- ✅ Initial MVP release
- ✅ Azure OpenAI integration
- ✅ Chrome extension with Manifest V3
- ✅ SQLite database for ticket history
- ✅ Root cause, solution, and search plan analysis
- ✅ Attachment processing framework
- ✅ Dark theme UI

## 📖 Documentation

- [Server Setup Guide](server/SETUP.md)
- [Extension README](extension/README.md)
- [API Documentation](docs/API.md) (coming soon)
- [Architecture Details](docs/ARCHITECTURE.md) (coming soon)

## 📄 License

MIT License - See LICENSE file for details

## 👤 Author

**Matthys Strydom** (@MStrydom2026)
- Sage Support Operations
- AI/ML Integration Specialist

---

**Status:** Beta Testing
**Last Updated:** 2026-09-16
**Support:** Internal Sage organization only (pending credentials)
