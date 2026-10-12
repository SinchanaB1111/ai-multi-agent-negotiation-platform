# NegoSphere Final UI + AI Guide Update

## Updated
- Redesigned authentication page to match the supplied NegoSphere login reference: split hero/login layout, blue-cyan branding, social login presentation, password visibility, recovery flow and security note.
- Added a complete Profile page with profile information, skills, performance, quick actions, recent activity and sign-out.
- Updated the profile header control to open the Profile page.
- Expanded the navigation menu to Dashboard, New Negotiation, My Sessions, Scenario Library, Analytics, Reports, Profile and Settings.
- Existing Sessions / Analytics / Reports / Settings workspace remains available through the platform workspace drawer.
- Upgraded the Guide Bot into an AI Guide that sends general questions to the Node AI backend.
- AI Guide provider order: Gemini -> Groq -> OpenAI -> local rule-based fallback.
- AI Guide accepts recent conversation history and current page context.
- If all providers fail, the Guide still returns a useful local answer instead of breaking the UI.

## Preserved
- Simulation Mode
- Practice Mode
- Decision engine
- Negotiation orchestrator
- Concession tracking
- Scenario Library
- Custom scenarios
- Session history
- Reports and analytics
- Authentication, OTP and password recovery
- Existing provider fallback for negotiation decisions

## Run

```powershell
npm install
npm run dev
```

In another terminal:

```powershell
npm run server
```

Configure API keys in a local `.env` using `.env.example` as the template. Never commit `.env`.
