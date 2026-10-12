# NegoSphere Social Login Setup (Google + GitHub + Microsoft)

NegoSphere now supports real browser OAuth sign-in for Google, GitHub, and Microsoft. The backend performs the provider code exchange, verifies the returned identity, creates/links the local user record, and returns a NegoSphere session token to the frontend.

## 1. Frontend origin

The OAuth start endpoint only accepts origins already listed in `CORS_ORIGINS`.

If Vite is running at `http://localhost:5174`, include it:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000
```

## 2. Backend callback URLs

Use these exact callback URLs in the provider dashboards:

- Google: `http://127.0.0.1:8000/api/auth/oauth/google/callback`
- GitHub: `http://127.0.0.1:8000/api/auth/oauth/github/callback`
- Microsoft: `http://127.0.0.1:8000/api/auth/oauth/microsoft/callback`

If you run FastAPI on a different host/port, change `OAUTH_CALLBACK_BASE_URL` and register the matching URLs.

## 3. .env

Add these values. Do not commit secrets:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT=common
OAUTH_CALLBACK_BASE_URL=http://127.0.0.1:8000
```

Keep your existing SMTP settings; social login does not replace email OTP.

## Google

Create an OAuth client for a web application in Google Cloud. Add the backend callback URL above as an authorized redirect URI. Request scopes `openid email profile`.

## GitHub

Create an OAuth App in GitHub Developer Settings. Set the Authorization callback URL to the backend callback URL above. NegoSphere requests `read:user user:email`. GitHub's web OAuth flow redirects the user back with a temporary code, which the backend exchanges for an access token. See the official GitHub OAuth documentation.

## Microsoft

Create an App Registration in Microsoft Entra. Add a Web redirect URI using the Microsoft callback URL above. Use tenant `common` for Microsoft personal accounts plus organizational accounts. The backend uses the authorization-code flow with `openid profile email User.Read` and reads the signed-in profile from Microsoft Graph.

## Flow

1. User clicks Google/GitHub/Microsoft.
2. Browser goes to the provider.
3. Provider authenticates and redirects to FastAPI.
4. FastAPI validates state and exchanges the authorization code.
5. FastAPI creates or finds the user in SQLite.
6. FastAPI generates the normal NegoSphere session token.
7. Browser returns to NegoSphere and the token is placed in the URL fragment, then immediately removed from browser history.

For production, move the OAuth session handoff to a server-side one-time code or secure HttpOnly cookie rather than relying on a browser fragment.
