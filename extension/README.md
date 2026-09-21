# NetAdmin Test - local setup

This test build is configured for the existing backend at:

`C:\\MP\\Employee Forms\\AI\\Github Copilot\\NetAdmin Assistant\\netadmin-ai-helper`

The browser extension cannot start a Windows process or read the `.env` file directly. Start the backend from that folder first:

```bat
cd /d "C:\\MP\\Employee Forms\\AI\\Github Copilot\\NetAdmin Assistant\\netadmin-ai-helper"
npm start
```

The extension calls `http://127.0.0.1:3000`. The backend status check supports both:

- `GET /health` (new backend)
- `GET /` (the currently running `netadmin-ai-helper`, which returns status `ok`)

After changing or reloading the extension, open `chrome://extensions`, click **Reload**, and refresh the NetAdmin page.

The `.env` file stays on your machine and is not copied into GitHub.
