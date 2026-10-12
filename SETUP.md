# NegoSphere Setup

## 1. Add your API keys

Open `.env` in the project root and add the provider keys you own:

```env
GEMINI_API_KEY=YOUR_GEMINI_KEY
GEMINI_MODEL=gemini-2.0-flash
GROQ_API_KEY=YOUR_GROQ_KEY
OPENAI_API_KEY=YOUR_OPENAI_KEY

VITE_PLATFORM_API_BASE_URL=http://127.0.0.1:8000/api
VITE_NEGOTIATION_API_BASE_URL=http://127.0.0.1:3001
```

Do not commit real keys to GitHub.

## 2. Install frontend dependencies

From the `Negosphere` folder:

```powershell
npm install
```

## 3. Start three services

### Terminal 1 — frontend

```powershell
cd <path>\Negosphere
npm run dev
```

Open `http://localhost:5173`.

### Terminal 2 — authentication/history backend

```powershell
cd <path>\Negosphere\platform-backend
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 3 — AI provider gateway

```powershell
cd <path>\Negosphere
npm run ai-server
```

## 4. Verify provider configuration

In PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/llm/status
```

`configured.gemini` should be `True` when the Gemini key is present.

To directly test Gemini:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/test-gemini
```

The negotiation uses Gemini first, then configured backup providers, and only falls back to the local rule engine if all configured providers fail.

## Included updates

- Removed the **Source** column from Negotiation History.
- Practice Mode completion now supports **Download PDF Report**.
- Added **Forgot password → email OTP → verification → new password**.
- Password recovery uses the backend email OTP infrastructure.
- Preserved the existing NegoSphere UI and working negotiation flow.
- Deadlock reports no longer display the last offer as a final agreement value.
