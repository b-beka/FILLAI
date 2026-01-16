"""User profile routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.database import get_db
from app.db_models import User
from app.auth import get_current_user
from app.schemas import UserResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/users", tags=["users"])


class UserUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    """Get user profile"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    payload: UserUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user profile (own profile only)"""
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}/achievements")
def get_achievements(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    """Get user achievements (placeholder)"""
    # TODO: Implement achievements system
    return {"achievements": []}

