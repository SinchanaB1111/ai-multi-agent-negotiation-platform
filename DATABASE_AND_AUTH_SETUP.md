# NegoSphere: Database + Real Login Setup

## Easiest local setup (recommended for your project demo)

NegoSphere uses SQLite by default, so you do **not** need to install MySQL/MongoDB just to run the project. The database file is `platform-backend/negotiation.db`.

### Create the database manually
From the project root:

```bat
cd platform-backend
python create_database.py
```

This creates/updates the tables automatically.

## Start the actual authentication server
Open one terminal:

```bat
START_BACKEND.bat
```

You should see FastAPI running at `http://localhost:8000`.

## Start the frontend
Open another terminal:

```bat
START_FRONTEND.bat
```

Or double-click `START_NEGOSPHERE.bat` to start both.

## Real email OTP
For development without SMTP, `DEV_SHOW_OTP=true` shows the generated 6-digit code in the page so the full flow can be tested.

For actual email delivery, create `platform-backend/.env` and configure:

```env
APP_ENV=development
AUTH_SECRET_KEY=change-this-for-your-project
DATABASE_URL=sqlite:///./negotiation.db
DEV_SHOW_OTP=false
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=yourgmail@gmail.com
SMTP_PASSWORD=your-16-character-google-app-password
SMTP_FROM_EMAIL=NegoSphere <yourgmail@gmail.com>
```

Use a Gmail **App Password**, not your normal Gmail password.

## Real flow

Sign up -> database user created -> OTP generated -> OTP emailed -> verify OTP -> account activated -> session token -> dashboard.

Sign in -> database password hash checked -> session token -> dashboard.

Forgot password -> reset OTP -> new password hash -> signed in.
