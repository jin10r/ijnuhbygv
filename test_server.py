#!/usr/bin/env python3
import sys
sys.path.insert(0, '/app/backend')

from fastapi import FastAPI, HTTPException
from models import UserCreate, User, Location
import traceback

app = FastAPI()

@app.post("/test-user")
async def test_create_user(user_data: UserCreate):
    try:
        print(f"Received user_data: {user_data}")
        print(f"user_data type: {type(user_data)}")
        print(f"user_data fields: {list(user_data.__dict__.keys())}")
        
        # Try to access job field
        try:
            job_value = user_data.job
            print(f"ERROR: Found job field: {job_value}")
        except AttributeError as e:
            print(f"Good: No job field - {e}")
        
        # Try to create User object
        user = User(
            telegram_id=user_data.telegram_id,
            username=user_data.username,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            profile_photo_url=user_data.profile_photo_url,
            age=user_data.age,
            gender=user_data.gender,
            about=user_data.about,
            price_range_min=user_data.price_range_min,
            price_range_max=user_data.price_range_max,
            metro_station=user_data.metro_station,
            search_radius=user_data.search_radius,
            location=Location(coordinates=[user_data.longitude, user_data.latitude])
        )
        
        return {"status": "success", "user_id": user.id}
        
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)