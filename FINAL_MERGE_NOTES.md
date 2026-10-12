# Final implementation: Sinchana UI + user's platform functionality

## Protected UI rule
The original NegoSphere/Sinchana UI components, styles, assets, and scenario data are preserved. Existing Sinchana UI files were compared byte-for-byte before packaging.

## Added functionality
- Login / signup / OTP authentication through `platform-backend`
- Guest demo mode
- Persistent authentication context
- Negotiation Guide Bot with contextual knowledge and quick questions
- User-scoped session history
- Analytics dashboard
- Detailed reports and PDF/HTML/TXT/JSON exports
- Scenario library/search and custom-scenario entry point
- Settings and negotiation preferences
- User profile synchronization into the NegoSphere dashboard
- Automatic synchronization of completed NegoSphere sessions into the user's history/analytics layer
- User's backend authentication, analytics, guide, negotiation and LLM services

## Run

### Frontend
```bash
npm install
npm run dev
```

### Platform backend
From the project root:
```bash
python -m pip install -r platform-backend/requirements.txt
python -m uvicorn app.main:app --reload --port 8000 --app-dir platform-backend
```

Set `VITE_PLATFORM_API_BASE_URL=http://localhost:8000/api` in the frontend `.env` if using a non-default backend address.

## Important
The ZIP intentionally does not contain `node_modules`, `.git`, or generated `dist` output. Run `npm install` on the target machine so dependencies are installed for that environment.
