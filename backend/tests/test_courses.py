"""Tests for courses endpoints"""
import pytest
from fastapi import status


def test_list_courses(client):
    """Test listing public courses"""
    response = client.get("/api/courses")
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)


def test_get_course_not_found(client):
    """Test getting non-existent course"""
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/courses/{fake_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_enroll_course(client, auth_headers, db):
    """Test enrolling in a course"""
    from app.db_models import Course, Category
    import uuid
    
    # Create a test course
    category = Category(id=uuid.uuid4(), label="Test Category")
    db.add(category)
    db.commit()
    
    course = Course(
        id=uuid.uuid4(),
        title="Test Course",
        description="Test Description",
        category_id=category.id,
        created_by=uuid.uuid4(),  # Different user
        is_public=True
    )
    db.add(course)
    db.commit()
    
    # Enroll
    response = client.post(
        f"/api/courses/{course.id}/enroll",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert "message" in response.json()


def test_enroll_course_unauthorized(client, db):
    """Test enrolling without authentication"""
    from app.db_models import Course, Category
    import uuid
    
    category = Category(id=uuid.uuid4(), label="Test Category")
    db.add(category)
    db.commit()
    
    course = Course(
        id=uuid.uuid4(),
        title="Test Course",
        description="Test Description",
        category_id=category.id,
        created_by=uuid.uuid4(),
        is_public=True
    )
    db.add(course)
    db.commit()
    
    response = client.post(f"/api/courses/{course.id}/enroll")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_my_courses(client, auth_headers, db, test_user):
    """Test getting courses created by current user"""
    from app.db_models import Course, Category
    import uuid
    
    category = Category(id=uuid.uuid4(), label="Test Category")
    db.add(category)
    db.commit()
    
    course = Course(
        id=uuid.uuid4(),
        title="My Course",
        description="My Description",
        category_id=category.id,
        created_by=test_user.id,
        is_public=False  # Private course
    )
    db.add(course)
    db.commit()
    
    response = client.get("/api/courses/my", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    courses = response.json()
    assert len(courses) >= 1
    assert any(c["id"] == str(course.id) for c in courses)

