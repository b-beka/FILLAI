"""Progress tracking routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.db_models import Enrollment, StudentProgress, Lesson, Course, CourseModule
from app.auth import get_current_user
from app.db_models import User
from app.schemas import ProgressResponse

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.post("/lesson/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def complete_lesson(
    lesson_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark lesson as completed"""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    
    # Find enrollment - get module first, then course
    module = db.query(CourseModule).filter(CourseModule.id == lesson.module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    course = db.query(Course).filter(Course.id == module.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course.id,
        Enrollment.user_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must enroll in the course first"
        )
    
    # Check if already completed
    progress = db.query(StudentProgress).filter(
        StudentProgress.enrollment_id == enrollment.id,
        StudentProgress.lesson_id == lesson_id
    ).first()
    
    if progress:
        return {"message": "Already completed"}
    
    # Create progress record
    progress = StudentProgress(
        enrollment_id=enrollment.id,
        lesson_id=lesson_id,
        completed_at=datetime.utcnow()
    )
    db.add(progress)
    
    # Update enrollment progress
    total_lessons = db.query(Lesson).join(CourseModule).filter(
        CourseModule.course_id == course.id
    ).count()
    completed_lessons = db.query(StudentProgress).filter(
        StudentProgress.enrollment_id == enrollment.id
    ).count() + 1
    
    enrollment.progress_percent = int((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0
    enrollment.last_accessed_at = datetime.utcnow()
    
    if enrollment.progress_percent >= 100:
        enrollment.completed_at = datetime.utcnow()
    
    db.commit()
    return {"message": "Lesson completed", "progress": enrollment.progress_percent}


@router.get("/course/{course_id}", response_model=ProgressResponse)
def get_course_progress(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get progress for a course"""
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.user_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enrolled in this course"
        )
    
    completed_lessons = db.query(StudentProgress).filter(
        StudentProgress.enrollment_id == enrollment.id
    ).count()
    
    total_lessons = db.query(Lesson).join(CourseModule).filter(
        CourseModule.course_id == course_id
    ).count()
    
    return {
        "course_id": course_id,
        "progress_percent": enrollment.progress_percent,
        "completed_lessons": completed_lessons,
        "total_lessons": total_lessons,
        "last_accessed": enrollment.last_accessed_at,
        "completed_at": enrollment.completed_at
    }

