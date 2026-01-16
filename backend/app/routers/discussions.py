"""Discussions routes"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.db_models import Discussion, DiscussionReply, Course
from app.auth import get_current_user
from app.db_models import User
from app.schemas import DiscussionCreate, DiscussionResponse, DiscussionReplyCreate, DiscussionReplyResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/discussions", tags=["discussions"])


@router.get("", response_model=List[DiscussionResponse])
def list_discussions(
    course_id: Optional[UUID] = Query(None, description="Filter by course ID"),
    db: Session = Depends(get_db),
):
    """List discussions (optionally filtered by course)"""
    query = db.query(Discussion)
    if course_id:
        query = query.filter(Discussion.course_id == course_id)
    discussions = query.order_by(Discussion.is_pinned.desc(), Discussion.created_at.desc()).all()
    return discussions


@router.post("", response_model=DiscussionResponse, status_code=status.HTTP_201_CREATED)
def create_discussion(
    payload: DiscussionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new discussion"""
    # Verify course exists
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    discussion = Discussion(
        course_id=payload.course_id,
        author_id=current_user.id,
        title=payload.title,
        content=payload.content,
    )
    db.add(discussion)
    db.commit()
    db.refresh(discussion)
    return discussion


class ReplyContent(BaseModel):
    content: str

@router.post("/{discussion_id}/replies", response_model=DiscussionReplyResponse, status_code=status.HTTP_201_CREATED)
def create_reply(
    discussion_id: UUID,
    payload: ReplyContent,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reply to a discussion"""
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")
    
    reply = DiscussionReply(
        discussion_id=discussion_id,
        author_id=current_user.id,
        content=payload.content,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply


@router.post("/{discussion_id}/like", status_code=status.HTTP_200_OK)
def like_discussion(
    discussion_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Like/unlike a discussion"""
    discussion = db.query(Discussion).filter(Discussion.id == discussion_id).first()
    if not discussion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion not found")
    
    discussion.likes_count += 1
    db.commit()
    return {"message": "Liked", "likes": discussion.likes_count}


@router.post("/replies/{reply_id}/like", status_code=status.HTTP_200_OK)
def like_reply(
    reply_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Like/unlike a reply"""
    reply = db.query(DiscussionReply).filter(DiscussionReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply not found")
    
    reply.likes_count += 1
    db.commit()
    return {"message": "Liked", "likes": reply.likes_count}

