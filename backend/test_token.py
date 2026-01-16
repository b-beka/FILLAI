"""Test token generation and validation"""
from app.auth import create_access_token, verify_token
from app.database import SessionLocal
from app.db_models import User
from uuid import UUID

# Get first user from DB
db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No users found in database!")
    exit(1)

print(f"Testing with user: {user.email}")
print(f"User ID: {user.id}")
print(f"User ID type: {type(user.id)}")

# Create token
token_data = {"sub": str(user.id)}
token = create_access_token(token_data)
print(f"\nGenerated token: {token[:50]}...")

# Verify token
try:
    verified = verify_token(token, "access")
    print(f"\nToken verified successfully!")
    print(f"User ID from token: {verified.user_id}")
    print(f"User ID type: {type(verified.user_id)}")
    
    # Check if user exists with this ID
    db_user = db.query(User).filter(User.id == verified.user_id).first()
    if db_user:
        print(f"✓ User found in DB: {db_user.email}")
    else:
        print(f"✗ User NOT found in DB with ID: {verified.user_id}")
        
except Exception as e:
    print(f"\n✗ Token verification failed: {e}")

db.close()
