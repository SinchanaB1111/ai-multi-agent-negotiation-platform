# NegoSphere — Real Login / Signup Setup

## Stack
- React + Vite frontend
- FastAPI backend
- SQLAlchemy ORM
- SQLite database for local development
- PBKDF2-SHA256 password hashing
- Signed session tokens
- 6-digit email OTP verification

## Run locally

Terminal 1 — backend:

```bash
python -m pip install -r platform-backend/requirements.txt
python -m uvicorn app.main:app --reload --port 8000 --app-dir platform-backend
```

Terminal 2 — frontend:

```bash
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

## Database

The backend creates the SQLite database and tables automatically at startup. The default database is `negotiation.db` under the backend working directory. `users` stores accounts and `otp_tokens` stores time-limited verification codes.

For production, set `DATABASE_URL` to PostgreSQL (or another SQLAlchemy-supported production database).

## Real email OTP

Copy `platform-backend/.env.example` to `platform-backend/.env` and configure a real SMTP account, for example Gmail with an App Password:

```env
APP_ENV=development
AUTH_SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=sqlite:///./negotiation.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEV_SHOW_OTP=true

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=NegoSphere <your-email@gmail.com>
```

With SMTP configured, signup generates a 6-digit OTP and sends it to the user's email. The frontend then verifies that OTP and signs the user in.

If SMTP is not configured during local development, `DEV_SHOW_OTP=true` returns the generated code in the signup response so the complete flow can still be tested. Never use that behavior in production; set `DEV_SHOW_OTP=false`.

## Flow

```text
SIGN UP
  ↓
Validate input
  ↓
Create/update unverified user in DB
  ↓
Hash password
  ↓
Generate 6-digit OTP
  ↓
Send OTP email
  ↓
User enters OTP
  ↓
Verify OTP + mark user verified
  ↓
Issue session token
  ↓
Dashboard
```

```text
SIGN IN
  ↓
Find user in DB
  ↓
Verify password hash
  ↓
Require verification if account is unverified
  ↓
Issue session token
  ↓
Dashboard
```

Forgot-password already uses the same OTP infrastructure.
