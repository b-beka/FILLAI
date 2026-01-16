"""Tests for authentication endpoints"""
import pytest
from fastapi import status


def test_register_user(client):
    """Test user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "password123",
            "full_name": "New User"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert "password" not in data  # Password should not be in response


def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": test_user.email,
            "username": "differentuser",
            "password": "password123"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"].lower()


def test_register_duplicate_username(client, test_user):
    """Test registration with duplicate username"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "different@example.com",
            "username": test_user.username,
            "password": "password123"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "username" in response.json()["detail"].lower()


def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post(
        "/api/auth/login",
        data={"username": test_user.email, "password": "testpassword123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_user):
    """Test login with wrong password"""
    response = client.post(
        "/api/auth/login",
        data={"username": test_user.email, "password": "wrongpassword"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_nonexistent_user(client):
    """Test login with non-existent user"""
    response = client.post(
        "/api/auth/login",
        data={"username": "nonexistent@example.com", "password": "password123"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user(client, auth_headers):
    """Test getting current user info"""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "email" in data
    assert "username" in data


def test_get_current_user_unauthorized(client):
    """Test getting current user without token"""
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_refresh_token(client, test_user):
    """Test token refresh"""
    # First login
    login_response = client.post(
        "/api/auth/login",
        data={"username": test_user.email, "password": "testpassword123"}
    )
    refresh_token = login_response.json()["refresh_token"]
    
    # Refresh - note: refresh endpoint expects refresh_token as query parameter
    response = client.post(
        f"/api/auth/refresh?refresh_token={refresh_token}"
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

