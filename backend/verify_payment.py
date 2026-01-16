import requests
import uuid

BASE_URL = "http://localhost:8000/api"

def run_verification():
    print("Starting verification...")
    
    # 1. Register a new user
    email = f"test_{uuid.uuid4()}@example.com"
    password = "password123"
    username = f"user_{uuid.uuid4().hex[:8]}"
    
    print(f"Registering user: {email}")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "username": username,
        "full_name": "Test User"
    })
    
    if resp.status_code != 201:
        print(f"Registration failed: {resp.text}")
        return
    
    # 2. Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
        
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Check initial profile
    print("Checking profile...")
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    user = resp.json()
    print(f"User Plan: {user.get('subscription_plan')} (Expected: free)")
    print(f"Generations: {user.get('generations_count')} (Expected: 0)")
    
    if user.get('subscription_plan') != 'free':
        print("FAIL: User should start as free")
        return

    # 4. Initiate Payment
    print("Creating checkout session...")
    resp = requests.post(f"{BASE_URL}/payment/create-checkout-session", json={}, headers=headers)
    if resp.status_code != 200:
        print(f"Checkout creation failed: {resp.text}")
        return
    
    data = resp.json()
    session_id = data["session_id"]
    print(f"Session ID: {session_id}")
    
    # 5. Complete Payment
    print("Completing payment (mock)...")
    resp = requests.post(f"{BASE_URL}/payment/mock-success?session_id={session_id}", headers=headers)
    if resp.status_code != 200:
        print(f"Payment completion failed: {resp.text}")
        return
        
    # 6. Check profile again
    print("Verifying upgrade...")
    resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    user = resp.json()
    print(f"User Plan: {user.get('subscription_plan')} (Expected: premium)")
    
    if user.get('subscription_plan') == 'premium':
        print("SUCCESS: User successfully upgraded to Premium!")
    else:
        print("FAIL: User was not upgraded.")

if __name__ == "__main__":
    run_verification()
