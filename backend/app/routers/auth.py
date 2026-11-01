"""Authentication routes"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.db_models import User
from app.schemas import UserCreate, UserResponse, UserLogin, Token
from app.auth import (
    authenticate_user,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    create_verification_token,
    create_password_reset_token,
    verify_token,
    verify_verification_token,
    verify_password_reset_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    timedelta
)
from app.services.email_service import send_verification_email, send_password_reset_email
from datetime import datetime
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Rate limiting for auth endpoints (if slowapi is available)
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    
    limiter = Limiter(key_func=get_remote_address)
    RATE_LIMIT_AVAILABLE = True
except ImportError:
    RATE_LIMIT_AVAILABLE = False
    limiter = None

def get_rate_limit():
    """Get rate limit decorator if available"""
    if RATE_LIMIT_AVAILABLE and limiter:
        return limiter.limit("5/minute")
    return lambda f: f  # No-op decorator if rate limiting not available


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@get_rate_limit()
async def register(
    request: Request,
    user_data: UserCreate, 
    db: Session = Depends(get_db)
):
    """Register a new user. Rate limited to prevent abuse."""
    # Check if user already exists
    # Без учёта регистра: вход тоже регистронезависимый
    existing_user = db.query(User).filter(
        (func.lower(User.email) == user_data.email.lower()) | (func.lower(User.username) == user_data.username.lower())
    ).first()
    
    if existing_user:
        if existing_user.email.lower() == user_data.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Эта почта уже зарегистрирована"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот логин уже занят"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role="student",  # Default role
        email_verified=False
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Send verification email
        try:
            verification_token = create_verification_token(str(db_user.id))
            await send_verification_email(db_user.email, verification_token)
        except Exception as e:
            # Don't fail registration if email fails
            print(f"Warning: Failed to send verification email: {e}")
        
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )


@router.post("/login", response_model=Token)
@get_rate_limit()
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token. Rate limited to prevent brute force attacks."""
    # OAuth2PasswordRequestForm: в поле 'username' — логин или почта
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/login/json", response_model=Token)
@get_rate_limit()
async def login_json(request: Request, user_data: UserLogin, db: Session = Depends(get_db)):
    """Login by username or email using JSON (alternative to OAuth2 form). Rate limited."""
    user = authenticate_user(db, user_data.login, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    token_data = verify_token(refresh_token, "refresh")
    user = db.query(User).filter(User.id == token_data.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Create new tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/logout")
async def logout():
    """Logout (client should discard tokens)"""
    # In a stateless JWT system, logout is handled client-side
    # For token blacklisting, you would need Redis or similar
    return {"message": "Successfully logged out"}


@router.post("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email using verification token"""
    try:
        token_data = verify_verification_token(token)
        user = db.query(User).filter(User.id == token_data.user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.email_verified:
            return {"message": "Email already verified"}
        
        user.email_verified = True
        db.commit()
        
        return {"message": "Email verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or expired verification token: {str(e)}"
        )


@router.post("/forgot-password")
@get_rate_limit()
async def forgot_password(request: Request, email: str, db: Session = Depends(get_db)):
    """Request password reset. Rate limited to prevent email spam."""
    user = db.query(User).filter(User.email == email).first()
    
    # Don't reveal if user exists (security best practice)
    if user:
        try:
            reset_token = create_password_reset_token(str(user.id))
            await send_password_reset_email(user.email, reset_token)
        except Exception as e:
            print(f"Warning: Failed to send password reset email: {e}")
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    """Reset password using reset token"""
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    try:
        token_data = verify_password_reset_token(token)
        user = db.query(User).filter(User.id == token_data.user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.password_hash = get_password_hash(new_password)
        db.commit()
        
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or expired reset token: {str(e)}"
        )


@router.post("/resend-verification")
async def resend_verification_email(current_user: User = Depends(get_current_user)):
    """Resend verification email"""
    if current_user.email_verified:
        return {"message": "Email already verified"}
    
    try:
        verification_token = create_verification_token(str(current_user.id))
        await send_verification_email(current_user.email, verification_token)
        return {"message": "Verification email sent"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification email: {str(e)}"
        )

