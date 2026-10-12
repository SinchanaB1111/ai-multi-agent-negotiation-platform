# AI Multi-Agent Negotiation Platform

## Practice Mode orchestration update

Practice Mode now uses the same central negotiation orchestration layer as Simulation Mode.

### Orchestrator responsibilities
- Records every human and AI offer in `state.offers`.
- Records every offer/counteroffer/decision/system event in `state.history`.
- Calculates concessions from each agent's previous offer using `concessionTracker.js`.
- Maintains `state.concessions` and aggregate negotiation metrics.
- Owns round progression: one complete human → AI exchange advances the practice round.
- Maintains the active agent and canonical `state.turn` object.
- Enforces hard negotiation constraints and the existing convergence safeguards.
- Handles LLM failure through the rule-based fallback path.

### Practice UI
`PracticeArena.jsx` only collects human input and delegates the negotiation turn to:

`processPracticeOffer(state, humanOffer)` in `src/logic/orchestrator.js`.

This prevents Practice Mode from maintaining a second, conflicting round/history/concession implementation.

## Verification

Run:

```bash
npm run verify:practice-orchestrator
npm run verify:practice
npm run verify:negotiation
npm run verify:all-scenarios
npm run lint
npm run build
```

## Backend deployment requirements

For production, set `APP_ENV=production`, provide a persistent `DATABASE_URL`, and set `AUTH_SECRET_KEY` to a high-entropy secret that is shared by every backend instance. Configure `CORS_ORIGINS` with the exact deployed frontend origins. Configure the mail service or SMTP credentials before enabling account signup; signup and OTP resend return an error if a verification email cannot be delivered. Do not commit production secrets.

## Practice Mode decision control

Practice Mode supports two independent decision makers:

- **AI/LLM:** Gemini may return `ACCEPT`, `REJECT`, or `COUNTER`. Valid LLM decisions are respected by the orchestrator. The orchestrator only validates/sanitizes malformed counteroffer amounts. If all LLM providers fail, the existing rule-based fallback is used.
- **Human participant:** when the AI has made the current offer, the participant can **Accept Offer**, **Reject Offer**, or submit a new counteroffer at any time. Human decisions are recorded through the same orchestrator decision/history pipeline.

The orchestrator remains responsible for round advancement, negotiation status, history, and concession tracking.

## NegoSphere local run

Open three PowerShell terminals from the `Negosphere` folder:

```powershell
# Terminal 1 - frontend
npm install
npm run dev

# Terminal 2 - authentication/history FastAPI backend
cd platform-backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 3 - AI provider gateway
cd ..
npm run ai-server
```

Create `.env` in the project root from `.env.example` and add your own `GEMINI_API_KEY`, `GROQ_API_KEY`, and/or `OPENAI_API_KEY`. The AI gateway uses Gemini first, then configured backup providers, and only uses the local rule engine when all configured providers fail. Never commit real API keys to Git.

Password recovery uses the same email OTP infrastructure: **Forgot password → email → verification code → new password**.
