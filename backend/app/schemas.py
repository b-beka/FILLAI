"""Pydantic schemas for API requests and responses"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: str
    email_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    subscription_plan: str
    generations_count: int
    subscription_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[UUID] = None


# Module and Lesson Schemas (defined first for forward references)
class LessonBase(BaseModel):
    title: str
    content: Optional[str] = None
    duration_minutes: Optional[int] = None
    order: int = 0


class LessonCreate(LessonBase):
    pass


class LessonResponse(LessonBase):
    id: UUID
    module_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 0


class ModuleCreate(ModuleBase):
    lessons: Optional[List[LessonCreate]] = None


class ModuleResponse(ModuleBase):
    id: UUID
    course_id: UUID
    lessons: List[LessonResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# Category Schemas
class CategoryBase(BaseModel):
    label: str
    description: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: UUID
    created_at: datetime
    # We might want to include courses count or something, but for now keep it simple

    class Config:
        from_attributes = True


# Course Schemas
class CourseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Course title")
    description: Optional[str] = Field(None, max_length=5000, description="Course description")
    category_id: Optional[UUID] = None
    format: Optional[str] = Field(None, max_length=50)
    level: Optional[str] = Field(None, max_length=50)
    duration: Optional[str] = Field(None, max_length=100)
    intensity: Optional[str] = Field(None, max_length=50)
    goal: Optional[str] = Field(None, max_length=1000)
    is_paid: bool = False
    price: Optional[float] = Field(None, ge=0, description="Price must be non-negative")
    is_public: bool = True
    is_private: bool = False
    tags: Optional[List[str]] = Field(None, max_items=20, description="Maximum 20 tags")


class CourseCreate(CourseBase):
    modules: Optional[List[ModuleCreate]] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    format: Optional[str] = None
    level: Optional[str] = None
    duration: Optional[str] = None
    is_paid: Optional[bool] = None
    price: Optional[float] = None
    is_public: Optional[bool] = None
    is_private: Optional[bool] = None
    tags: Optional[List[str]] = None


class CourseResponse(CourseBase):
    id: UUID
    created_by: UUID
    share_link: Optional[str] = None
    published_at: Optional[datetime] = None
    views: int
    created_at: datetime
    updated_at: datetime
    modules: Optional[List[ModuleResponse]] = []

    class Config:
        from_attributes = True


# Enrollment Schemas
class EnrollmentCreate(BaseModel):
    course_id: UUID


class EnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    enrolled_at: datetime
    progress_percent: int
    last_accessed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Progress Schemas
class ProgressUpdate(BaseModel):
    lesson_id: UUID
    completed: bool = True
    time_spent_minutes: Optional[int] = None


class ProgressResponse(BaseModel):
    course_id: UUID
    progress_percent: int
    completed_lessons: int
    total_lessons: int
    last_accessed: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# Discussion Schemas
class DiscussionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Discussion title")
    content: str = Field(..., min_length=1, max_length=10000, description="Discussion content (max 10000 chars)")


class DiscussionCreate(DiscussionBase):
    course_id: UUID


class DiscussionResponse(DiscussionBase):
    id: UUID
    course_id: UUID
    author_id: UUID
    likes_count: int
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    replies: List['DiscussionReplyResponse'] = []

    class Config:
        from_attributes = True


class DiscussionReplyBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Reply content (max 5000 chars)")


class DiscussionReplyCreate(DiscussionReplyBase):
    discussion_id: UUID


class DiscussionReplyResponse(DiscussionReplyBase):
    id: UUID
    discussion_id: UUID
    author_id: UUID
    likes_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Update forward references
DiscussionResponse.model_rebuild()
DiscussionReplyResponse.model_rebuild()
CourseResponse.model_rebuild()


class GradeRequest(BaseModel):
    course_title: str
    lesson_title: str
    exercise_title: str
    exercise_description: str
    user_answer: str

class GradeResponse(BaseModel):
    score: int
    verdict: str
    strengths: List[str]
    improvements: List[str]
    ai_feedback: str
