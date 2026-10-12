import os
import requests
import smtplib
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Dict, Any

from app.config import settings

logger = logging.getLogger("email_service")
executor = ThreadPoolExecutor(max_workers=3)

def send_otp_via_mail_service(email: str, otp: str) -> Dict[str, Any]:
    """
    Calls the external Vercel mail service endpoint for OTP delivery.
    """
    mail_service_url = os.getenv("MAIL_SERVICE_URL") or settings.MAIL_SERVICE_URL
    mail_service_secret = os.getenv("MAIL_SERVICE_SECRET") or settings.MAIL_SERVICE_SECRET

    if not mail_service_url:
        raise Exception("MAIL_SERVICE_URL is not configured")

    if not mail_service_secret:
        raise Exception("MAIL_SERVICE_SECRET is not configured")

    response = requests.post(
        mail_service_url,
        json={
            "email": email,
            "otp": otp
        },
        headers={
            "Authorization": f"Bearer {mail_service_secret}",
            "Content-Type": "application/json"
        },
        timeout=20
    )

    response.raise_for_status()

    return response.json()

def send_otp_email(to_email: str, otp_code: str, name: str = "User") -> Tuple[bool, str]:
    """
    Send OTP through a real email provider.

    SMTP is preferred when configured because it is fully controlled by the
    NegoSphere deployment. The optional Vercel mail service is used only when
    SMTP is not configured or SMTP delivery fails. OTPs are never returned to
    the frontend as a development fallback.
    """
    smtp_is_configured = settings.smtp_enabled

    if smtp_is_configured:
        smtp_ok, smtp_msg = _send_smtp_sync(to_email, otp_code, name)
        if smtp_ok:
            return True, smtp_msg
        logger.warning("SMTP OTP delivery failed: %s", smtp_msg)

    # Optional external provider fallback. It is only attempted when a secret
    # is actually configured, so a missing Vercel secret does not create noisy
    # connection attempts.
    if settings.MAIL_SERVICE_URL and settings.MAIL_SERVICE_SECRET:
        try:
            res = send_otp_via_mail_service(to_email, otp_code)
            success_msg = f"OTP email successfully sent to {to_email} via mail service."
            logger.info("%s Response: %s", success_msg, res)
            return True, success_msg
        except Exception as exc:
            logger.warning("External mail service OTP delivery failed: %s", exc)

    return False, (
        "Email delivery is not configured or the configured email provider "
        "rejected the message. Configure SMTP_USERNAME and SMTP_PASSWORD "
        "in platform-backend/.env."
    )


def _build_html_template(to_email: str, otp_code: str, name: str = "User") -> str:
    user_display = name if name and name.strip() else to_email.split("@")[0]
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Verification Code - NegoSphere</title>
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0c0c0f;
          color: #f8fafc;
          margin: 0;
          padding: 20px;
        }}
        .container {{
          max-width: 520px;
          margin: 0 auto;
          background-color: #17161b;
          border: 1px solid #27262f;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }}
        .header {{
          text-align: center;
          padding-bottom: 24px;
          border-bottom: 1px solid #27262f;
        }}
        .logo {{
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
        }}
        .logo-badge {{
          color: #10b981;
          font-weight: 800;
        }}
        .content {{
          padding: 28px 0;
          text-align: center;
        }}
        .greeting {{
          font-size: 16px;
          color: #cbd5e1;
          margin-bottom: 12px;
        }}
        .otp-card {{
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin: 24px 0;
          text-align: center;
        }}
        .otp-code {{
          font-family: 'Courier New', Courier, monospace;
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 10px;
          color: #10b981;
          margin: 8px 0;
        }}
        .notice {{
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
        }}
        .footer {{
          text-align: center;
          border-top: 1px solid #27262f;
          padding-top: 20px;
          font-size: 11px;
          color: #64748b;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">NegoSphere <span class="logo-badge">AI</span></div>
        </div>
        <div class="content">
          <div class="greeting">Hello, <strong>{user_display}</strong>!</div>
          <p class="notice">
            Use the 6-digit verification code below to complete your registration or login for NegoSphere.
          </p>
          <div class="otp-card">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #10b981; letter-spacing: 1px;">
              Your Verification Code
            </div>
            <div class="otp-code">{otp_code}</div>
            <div style="font-size: 11px; color: #94a3b8;">Valid for 10 minutes</div>
          </div>
          <p class="notice">
            If you did not request this verification code, please ignore this email.
          </p>
        </div>
        <div class="footer">
          &copy; NegoSphere Platform • Multi-Agent Negotiation Training System
        </div>
      </div>
    </body>
    </html>
    """

def _send_smtp_sync(to_email: str, otp_code: str, name: str = "User") -> Tuple[bool, str]:
    if not settings.smtp_enabled:
        msg = "Email delivery is not configured in the backend."
        logger.warning("[SMTP] OTP delivery skipped because SMTP credentials are not configured.")
        return False, msg

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp_code} is your NegoSphere Verification Code"
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        plain_text = f"Hello {name},\n\nYour NegoSphere OTP verification code is: {otp_code}\n\nThis code expires in 10 minutes."
        html_text = _build_html_template(to_email, otp_code, name)

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_text, "html"))

        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USERNAME, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USERNAME, [to_email], msg.as_string())

        success_msg = f"Successfully dispatched email OTP to {to_email} via SMTP ({settings.SMTP_SERVER})."
        logger.info(success_msg)
        return True, success_msg

    except Exception as exc:
        err_msg = f"Failed to send email via SMTP ({type(exc).__name__}): {exc}"
        logger.error(err_msg)
        return False, err_msg

async def dispatch_otp_email_async(to_email: str, otp_code: str, name: str = "User") -> Tuple[bool, str]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, _send_smtp_sync, to_email, otp_code, name)
