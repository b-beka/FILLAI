import requests
import uuid
import json
import time

BASE_URL = "http://localhost:8000"

def run_test():
    # 1. Register a random user
    username = f"test_{uuid.uuid4().hex[:8]}"
    email = f"{username}@example.com"
    password = "password123"
    
    print(f"Registering user: {username}")
    res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    
    if res.status_code != 200 and res.status_code != 201:
        print(f"Registration failed: {res.text}")
        return

    # 2. Login
    print("Logging in...")
    res = requests.post(f"{BASE_URL}/api/auth/login", data={
        "username": email,
        "password": password
    })
    
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return
        
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Generate Course
    print("Generating course (this might take a few seconds)...")
    course_title = f"Test Course {uuid.uuid4().hex[:4]}"
    
    payload = {
        "settings": {
            "title": course_title,
            "target_audience": "Beginners",
            "difficulty": "beginner",
            "duration_hours": 1
        }
    }
    
    res = requests.post(f"{BASE_URL}/api/courses/generate", json=payload, headers=headers)
    
    if res.status_code != 200:
        print(f"Generation failed: {res.text}")
        # If it failed due to API key, we can't fully verify persistence without it unless we mock the coordinator
        return
        
    generated_course = res.json().get("course")
    if not generated_course:
        print(f"No course in response: {res.text}")
        return
        
    print(f"Course generation response received. generated_id={generated_course.get('id')}")
    
    # 4. Verify Persistence
    print("Verifying persistence via GET /api/courses/my ...")
    res = requests.get(f"{BASE_URL}/api/courses/my", headers=headers)
    
    if res.status_code != 200:
        print(f"Failed to list courses: {res.text}")
        return
        
    my_courses = res.json()
    found = next((c for c in my_courses if c["title"] == course_title), None)
    
    if found:
        print(f"Success! Found course '{course_title}' in DB with ID {found['id']}")
        
        # Verify ID format
        try:
            uuid.UUID(found['id'])
            print("ID is a valid UUID")
        except ValueError:
            print(f"ID is NOT a valid UUID: {found['id']}")
            
    else:
        print("Course NOT found in list. Persistence failed.")
        print("My courses:", [c["title"] for c in my_courses])

if __name__ == "__main__":
    run_test()
