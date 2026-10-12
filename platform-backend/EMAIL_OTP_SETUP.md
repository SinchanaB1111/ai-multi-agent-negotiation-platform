# NegoSphere Real Email OTP Setup

NegoSphere sends verification and password-reset OTPs through SMTP. Gmail is the simplest local-demo provider.

## 1. Create a Google App Password

Use a Google account that is allowed to send the project emails. Enable 2-Step Verification on the account, then create a 16-character Google App Password for NegoSphere. Do not use the normal Gmail account password.

## 2. Edit `platform-backend/.env`

Set:

```env
DEV_SHOW_OTP=false
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=yourgmail@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=NegoSphere <yourgmail@gmail.com>
```

Do not add quotes unless your password contains characters that require them. Keep the `.env` file private and do not commit it to Git.

## 3. Restart FastAPI

Stop the existing backend window with `Ctrl+C`, then run `START_BACKEND.bat` again.

## 4. Test

Create a new NegoSphere account with an email address you can access. The OTP should arrive in that mailbox. The OTP will not be displayed in the browser or returned by the signup API.

If delivery fails, the signup page will show an email-delivery error and the backend terminal will contain the SMTP error details.
