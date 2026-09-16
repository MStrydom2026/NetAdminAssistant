# NetAdmin Assistant Backend - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Azure OpenAI credentials:

```env
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-org.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment
PORT=3000
```

### 3. Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will be available at `http://localhost:3000`

## API Endpoints

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed status with stats
- `GET /health/ready` - Readiness check

### Analysis
- `POST /api/analyze` - Analyze a single ticket
- `POST /api/analyze/batch` - Analyze multiple tickets (max 10)
- `POST /api/analyze/search` - Execute search queries

### History & Feedback
- `GET /api/history/tickets` - Get ticket history
- `GET /api/history/tickets/:ticketId` - Get ticket details
- `GET /api/history/analyses/:ticketId` - Get ticket analyses
- `POST /api/history/feedback` - Submit feedback
- `GET /api/history/stats` - Get statistics

## Database

Database is automatically initialized on first run.

View database:
```bash
sqlite3 data/netadmin-assistant.db
```

## Testing with cURL

### Health Check
```bash
curl http://localhost:3000/health
```

### Analyze Ticket
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "TKT001",
    "subject": "Module installation error",
    "description": "Getting error when installing Sage 300 module",
    "metadata": {"priority": "high"}
  }'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `AI_PROVIDER` | AI backend (azure, openai, mock) | azure |
| `AZURE_OPENAI_API_KEY` | Azure API key | - |
| `AZURE_OPENAI_ENDPOINT` | Azure endpoint URL | - |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment name | - |
| `DB_PATH` | SQLite database path | ./data/netadmin-assistant.db |
| `ENABLE_LOCAL_ANALYSIS` | Enable fallback analysis | true |

## Troubleshooting

### Database errors
```bash
# Reinitialize database
rm data/netadmin-assistant.db
npm start
```

### Azure OpenAI connection failed
- Check API key in `.env`
- Verify endpoint URL is correct
- Confirm deployment name exists in Azure
- Check network connectivity

### Using Mock Provider for Testing
```env
AI_PROVIDER=mock
```

No API keys needed - responses are simulated.
