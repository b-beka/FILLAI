from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.db_models import User
from app.auth import get_current_user

FREE_TIER_LIMIT = 100

async def check_generation_limit(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if the user has reached their generation limit.
    Free users are limited to 5 generations.
    """
    if current_user.role == 'admin': # Admin always unlimited
        return current_user

    if current_user.subscription_plan == 'premium':
        return current_user
    
    # Check free tier limit
    if current_user.generations_count >= FREE_TIER_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free tier limit reached. Please upgrade to Premium."
        )
    
    return current_user

async def increment_generation_count(user_id: str, db: Session):
    """
    Increment the generation count for a user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.generations_count += 1
        db.commit()
