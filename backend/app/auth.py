"""Authentication utilities"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.db_models import User
from app.schemas import TokenData
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_verification_token(user_id: str) -> str:
    """Create email verification token (valid for 24 hours)"""
    to_encode = {"sub": user_id, "type": "verification"}
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_password_reset_token(user_id: str) -> str:
    """Create password reset token (valid for 1 hour)"""
    to_encode = {"sub": user_id, "type": "password_reset"}
    expire = datetime.utcnow() + timedelta(hours=1)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_verification_token(token: str) -> TokenData:
    """Verify email verification token"""
    return verify_token(token, "verification")


def verify_password_reset_token(token: str) -> TokenData:
    """Verify password reset token"""
    return verify_token(token, "password_reset")


def verify_token(token: str, token_type: str = "access") -> TokenData:
    """Verify and decode JWT token"""
    from uuid import UUID
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        token_type_check: str = payload.get("type")
        
        if user_id_str is None:
            raise credentials_exception
        if token_type_check != token_type:
            raise credentials_exception
        
        # Convert string to UUID
        try:
            user_id = UUID(user_id_str)
        except (ValueError, TypeError):
            raise credentials_exception
            
        token_data = TokenData(user_id=user_id)
    except JWTError as e:
        print(f"DEBUG AUTH: JWT Error: {str(e)}")
        raise credentials_exception
    return token_data


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token_data = verify_token(token, "access")
    # print(f"DEBUG AUTH: User ID from token: {token_data.user_id}")
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        print(f"DEBUG AUTH: User {token_data.user_id} not found in DB")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )
    return current_user


def authenticate_user(db: Session, login: str, password: str) -> Optional[User]:
    """Authenticate user by username or email (без учёта регистра) and password"""
    login = login.strip().lower()
    user = db.query(User).filter(or_(func.lower(User.email) == login, func.lower(User.username) == login)).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

