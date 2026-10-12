# NegoSphere Authentication Setup

NegoSphere now has a real email/password authentication flow backed by FastAPI + SQLAlchemy + SQLite.

## 1. Database

Development uses SQLite automatically:

`platform-backend/negotiation.db`

The FastAPI startup creates the `users` and `otp_tokens` tables automatically. User passwords are stored as PBKDF2-SHA256 hashes, never as plain text.

## 2. Start the backend

From the project root:

```bash
python -m pip install -r platform-backend/requirements.txt
python -m uvicorn app.main:app --reload --port 8000 --app-dir platform-backend
```

The API is available at `http://localhost:8000/api`.

## 3. Start the frontend

In a second terminal:

```bash
npm install
npm run dev
```

The frontend now defaults to `http://localhost:8000/api` for authentication.

## 4. Real email OTP

Copy `platform-backend/.env.example` to `platform-backend/.env` and configure:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-character-gmail-app-password
SMTP_FROM_EMAIL=NegoSphere <your-email@gmail.com>
DEV_SHOW_OTP=false
```

For Gmail, use a Google App Password, not your normal Gmail password.

When SMTP is configured, signup sends the 6-digit code to the user's email. The API does not expose the OTP.

When SMTP is not configured in development, `DEV_SHOW_OTP=false` keeps local demos usable by showing the generated code in the UI. Set it to `false` for a stricter setup.

## 5. Authentication flow

```text
Sign Up
  -> create unverified user in SQLite
  -> generate 6-digit OTP
  -> email OTP
  -> enter OTP
  -> mark user verified
  -> issue session token
  -> dashboard

Sign In
  -> verify email/password against SQLite
  -> issue session token
  -> dashboard

Forgot Password
  -> email reset OTP
  -> verify OTP
  -> replace password hash
  -> issue session token
```
