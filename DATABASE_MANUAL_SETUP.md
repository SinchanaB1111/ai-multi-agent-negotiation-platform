# NegoSphere — Manual SQLite Database Setup (Windows)

The current error **"Unable to reach the NegoSphere authentication server" is not a database error**. It means the FastAPI server on `127.0.0.1:8000` is not running.

You can still create the database manually using **DB Browser for SQLite**.

## Option A — easiest: DB Browser for SQLite

1. Install **DB Browser for SQLite** on Windows.
2. Open DB Browser.
3. Click **New Database**.
4. Navigate to your project:
   `Negosphere\platform-backend\`
5. Set the filename to:
   `negotiation.db`
6. Save it.
7. Open the **Execute SQL** tab.
8. Paste the SQL from `database_schema.sql` in this project.
9. Click **Run**.
10. Click **Write Changes**.
11. Close DB Browser.

Your database is now:

`Negosphere\platform-backend\negotiation.db`

## Option B — use the included Windows script

Double-click:

`CREATE_DATABASE.bat`

It installs the Python dependencies and creates/verifies all required tables.

## Start the authentication server

After the database exists, double-click:

`START_BACKEND.bat`

Keep that black terminal window open.

You should see Uvicorn running on:

`http://127.0.0.1:8000`

Then open this in your browser:

`http://127.0.0.1:8000/api/health`

You should get a JSON response containing:

```json
{
  "status": "healthy",
  "database": "connected"
}
```

Only after this works should you open the React frontend.

## Start everything

The easiest method is:

`START_NEGOSPHERE.bat`

It starts:

- FastAPI authentication backend — port 8000
- AI gateway — port 3001
- React/Vite frontend — port 5173

## Login database tables

The authentication system uses:

- `users` — account details and password hashes
- `otp_tokens` — temporary verification/recovery OTPs

The password is never stored as plain text.

## Real email OTP

For actual email delivery, copy:

`platform-backend\.env.example`

to:

`platform-backend\.env`

Then set:

```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM_EMAIL=NegoSphere <your-email@gmail.com>
DEV_SHOW_OTP=false
```

For first testing, you can keep `DEV_SHOW_OTP=true`. The signup page will show the generated OTP when SMTP is not configured.
