"""Courses CRUD and enrollment routes"""
from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from app.database import get_db
from app.db_models import Course, Enrollment, CourseModule, Lesson, Tag, Category
from app.schemas import CourseCreate, CourseUpdate, CourseResponse, CategoryResponse
from app.auth import get_current_user
from app.db_models import User

security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/api/courses", tags=["courses"])

@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a course (only if creator)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    if course.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this course")
    
    # Delete associated enrollment first (cascade usually handles this but explicit is safer)
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
    
    db.delete(course)
    db.commit()
    return None


@router.get("", response_model=List[CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    """Public list of courses"""
    courses = db.query(Course).filter(Course.is_public == True).order_by(Course.created_at.desc()).all()
    return courses


@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """List all categories"""
    categories = db.query(Category).all()
    return categories


@router.get("/my", response_model=List[CourseResponse])
def my_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Courses created by current teacher (includes private courses)"""
    courses = db.query(Course).filter(Course.created_by == current_user.id).order_by(Course.created_at.desc()).all()
    return courses


@router.get("/my/{course_id}", response_model=CourseResponse)
def get_my_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get own course by ID (works for both public and private)"""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.created_by == current_user.id
    ).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.get("/enrolled", response_model=List[CourseResponse])
def enrolled_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Courses where current user is enrolled"""
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current_user.id).all()
    if not enrollments:
        return []
    course_ids = [e.course_id for e in enrollments]
    courses = db.query(Course).filter(Course.id.in_(course_ids)).all()
    return courses


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if token is provided, otherwise None"""
    if not credentials:
        return None
    try:
        from app.auth import verify_token, TokenData
        token_data = verify_token(credentials.credentials, "access")
        user = db.query(User).filter(User.id == token_data.user_id).first()
        return user
    except:
        return None


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: UUID, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get course by ID (public courses or own courses)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    # Allow access if:
    # 1. Course is public
    # 2. User is the creator
    # 3. User is enrolled (for private courses)
    if not course.is_public:
        if current_user:
            is_owner = course.created_by == current_user.id
            is_enrolled = db.query(Enrollment).filter(
                Enrollment.course_id == course_id,
                Enrollment.user_id == current_user.id
            ).first() is not None
            
            if not (is_owner or is_enrolled):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Course is private. You need to enroll first."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for private courses"
            )
    
    return course


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new course (teachers/orgs)"""
    db_course = Course(
        title=payload.title,
        description=payload.description,
        category_id=payload.category_id,
        format=payload.format,
        level=payload.level,
        duration=payload.duration,
        intensity=payload.intensity,
        goal=payload.goal,
        is_paid=payload.is_paid,
        price=payload.price,
        is_public=payload.is_public,
        is_private=payload.is_private,
        created_by=current_user.id,
    )

    db.add(db_course)
    db.flush()  # Flush to get the course ID
    
    # Handle tags
    if payload.tags:
        for tag_name in payload.tags:
            # Find or create tag
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            db_course.tags.append(tag)
    
    # Handle modules and lessons
    if payload.modules:
        for module_idx, module_data in enumerate(payload.modules):
            db_module = CourseModule(
                course_id=db_course.id,
                title=module_data.title,
                description=module_data.description,
                order=module_data.order or module_idx,
            )
            db.add(db_module)
            db.flush()
            
            # Handle lessons
            if module_data.lessons:
                for lesson_idx, lesson_data in enumerate(module_data.lessons):
                    db_lesson = Lesson(
                        module_id=db_module.id,
                        title=lesson_data.title,
                        content=lesson_data.content,
                        duration_minutes=lesson_data.duration_minutes,
                        order=lesson_data.order or lesson_idx,
                    )
                    db.add(db_lesson)

    db.commit()
    db.refresh(db_course)
    return db_course


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


@router.post("/{course_id}/enroll", status_code=status.HTTP_200_OK)
def enroll_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enroll in a course (public courses or private courses with access)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    # Check if course is accessible
    if not course.is_public and course.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot enroll in private course"
        )

    exists = (
        db.query(Enrollment)
        .filter(Enrollment.course_id == course_id, Enrollment.user_id == current_user.id)
        .first()
    )
    if exists:
        return {"message": "Already enrolled"}

    enrollment = Enrollment(user_id=current_user.id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    return {"message": "Enrolled"}
