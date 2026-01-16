"""Email service for sending verification and password reset emails"""
import os
from typing import Optional
import httpx
from fastapi import HTTPException

# Email provider configuration
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "resend")  # resend, sendgrid, or smtp
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@fillai.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


async def send_verification_email(email: str, token: str) -> bool:
    """Send email verification email"""
    verification_url = f"{FRONTEND_URL}/verify-email?token={token}"
    
    subject = "Подтвердите ваш email"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Добро пожаловать в Fill AI!</h1>
            <p>Спасибо за регистрацию. Пожалуйста, подтвердите ваш email адрес, нажав на кнопку ниже:</p>
            <a href="{verification_url}" class="button">Подтвердить email</a>
            <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
            <p style="word-break: break-all; color: #666;">{verification_url}</p>
            <p>Эта ссылка действительна в течение 24 часов.</p>
            <div class="footer">
                <p>Если вы не регистрировались на Fill AI, просто проигнорируйте это письмо.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Добро пожаловать в Fill AI!
    
    Пожалуйста, подтвердите ваш email адрес, перейдя по ссылке:
    {verification_url}
    
    Эта ссылка действительна в течение 24 часов.
    
    Если вы не регистрировались на Fill AI, просто проигнорируйте это письмо.
    """
    
    return await _send_email(email, subject, html_content, text_content)


async def send_password_reset_email(email: str, token: str) -> bool:
    """Send password reset email"""
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    
    subject = "Восстановление пароля"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
            .warning {{ background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Восстановление пароля</h1>
            <p>Вы запросили восстановление пароля для вашего аккаунта Fill AI.</p>
            <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
            <a href="{reset_url}" class="button">Восстановить пароль</a>
            <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
            <p style="word-break: break-all; color: #666;">{reset_url}</p>
            <div class="warning">
                <p><strong>Важно:</strong> Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.</p>
            </div>
            <p>Эта ссылка действительна в течение 1 часа.</p>
            <div class="footer">
                <p>Fill AI Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Восстановление пароля
    
    Вы запросили восстановление пароля для вашего аккаунта Fill AI.
    
    Перейдите по ссылке, чтобы создать новый пароль:
    {reset_url}
    
    Эта ссылка действительна в течение 1 часа.
    
    Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.
    """
    
    return await _send_email(email, subject, html_content, text_content)


async def _send_email(to: str, subject: str, html_content: str, text_content: str) -> bool:
    """Internal function to send email using configured provider"""
    if EMAIL_PROVIDER == "resend":
        return await _send_via_resend(to, subject, html_content, text_content)
    elif EMAIL_PROVIDER == "sendgrid":
        return await _send_via_sendgrid(to, subject, html_content, text_content)
    else:
        # Fallback: just log (for development)
        print(f"[EMAIL] Would send to {to}: {subject}")
        print(f"[EMAIL] Content: {text_content[:100]}...")
        return True  # Return True in dev mode to not block registration


async def _send_via_resend(to: str, subject: str, html_content: str, text_content: str) -> bool:
    """Send email via Resend API"""
    if not RESEND_API_KEY:
        print("[EMAIL] RESEND_API_KEY not set, skipping email send")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": EMAIL_FROM,
                    "to": [to],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"[EMAIL] Error sending via Resend: {e}")
        return False


async def _send_via_sendgrid(to: str, subject: str, html_content: str, text_content: str) -> bool:
    """Send email via SendGrid API"""
    if not SENDGRID_API_KEY:
        print("[EMAIL] SENDGRID_API_KEY not set, skipping email send")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": to}]}],
                    "from": {"email": EMAIL_FROM},
                    "subject": subject,
                    "content": [
                        {"type": "text/plain", "value": text_content},
                        {"type": "text/html", "value": html_content},
                    ],
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"[EMAIL] Error sending via SendGrid: {e}")
        return False

