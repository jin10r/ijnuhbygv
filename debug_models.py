#!/usr/bin/env python3
import sys
sys.path.insert(0, '/app/backend')

try:
    from models import UserCreate, User
    print("✅ Models imported successfully")
    
    # Test UserCreate
    data = {
        'telegram_id': 123456789,
        'username': 'test',
        'first_name': 'Test',
        'age': 25,
        'gender': 'female',
        'price_range_min': 30000,
        'price_range_max': 50000,
        'metro_station': 'Test',
        'search_radius': 5,
        'latitude': 55.7887,
        'longitude': 37.6796
    }
    
    user_create = UserCreate(**data)
    print("✅ UserCreate object created")
    print(f"Fields: {list(user_create.__dict__.keys())}")
    
    # Check if 'job' attribute exists
    if hasattr(user_create, 'job'):
        print("❌ ERROR: UserCreate has 'job' attribute!")
        print(f"job value: {user_create.job}")
    else:
        print("✅ UserCreate does NOT have 'job' attribute")
    
    # Test accessing job attribute
    try:
        job_value = user_create.job
        print(f"❌ ERROR: Accessed job attribute: {job_value}")
    except AttributeError as e:
        print(f"✅ Correctly raised AttributeError: {e}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()