"""Tests for progress tracking endpoints"""
import pytest
from fastapi import status


def test_complete_lesson(client, auth_headers, db, test_user):
    """Test marking a lesson as completed"""
    from app.db_models import Course, CourseModule, Lesson, Category, Enrollment
    import uuid
    
    # Create course structure
    category = Category(id=uuid.uuid4(), label="Test Category")
    db.add(category)
    db.commit()
    
    course = Course(
        id=uuid.uuid4(),
        title="Test Course",
        description="Test",
        category_id=category.id,
        created_by=uuid.uuid4(),
        is_public=True
    )
    db.add(course)
    db.commit()
    
    # Enroll user
    enrollment = Enrollment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        course_id=course.id
    )
    db.add(enrollment)
    db.commit()
    
    module = CourseModule(
        id=uuid.uuid4(),
        course_id=course.id,
        title="Test Module",
        order=0
    )
    db.add(module)
    db.commit()
    
    lesson = Lesson(
        id=uuid.uuid4(),
        module_id=module.id,
        title="Test Lesson",
        content="Test content",
        order=0
    )
    db.add(lesson)
    db.commit()
    
    # Complete lesson
    response = client.post(
        f"/api/progress/lesson/{lesson.id}/complete",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "message" in data
    assert "progress" in data


def test_get_course_progress(client, auth_headers, db, test_user):
    """Test getting course progress"""
    from app.db_models import Course, CourseModule, Lesson, Category, Enrollment
    import uuid
    
    category = Category(id=uuid.uuid4(), label="Test Category")
    db.add(category)
    db.commit()
    
    course = Course(
        id=uuid.uuid4(),
        title="Test Course",
        description="Test",
        category_id=category.id,
        created_by=uuid.uuid4(),
        is_public=True
    )
    db.add(course)
    db.commit()
    
    enrollment = Enrollment(
        id=uuid.uuid4(),
        user_id=test_user.id,
        course_id=course.id,
        progress_percent=50
    )
    db.add(enrollment)
    db.commit()
    
    response = client.get(
        f"/api/progress/course/{course.id}",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["course_id"] == str(course.id)
    assert "progress_percent" in data
    assert data["progress_percent"] == 50

