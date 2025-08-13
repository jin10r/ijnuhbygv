from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional
import os
import logging
from dotenv import load_dotenv

from database import (
    connect_to_mongo, 
    close_mongo_connection, 
    create_indexes,
    get_users_collection,
    get_properties_collection,
    get_likes_collection,
    get_matches_collection
)
from models import (
    User, UserCreate, UserUpdate, UserResponse,
    Property, PropertyResponse,
    Like, Match,
    Location
)
from services import (
    create_user_service,
    get_user_by_telegram_id_service,
    update_user_service,
    get_properties_near_user_service,
    get_potential_matches_service,
    create_like_service,
    check_match_service,
    get_user_matches_service,
    get_user_liked_properties_service
)

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    await create_indexes()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Roommate Finder API",
    description="API for Telegram Web App roommate finder",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Roommate Finder API is running"}

@app.post("/api/users/test")
async def test_create_user():
    """Test endpoint to check if POST works"""
    return {"status": "success", "message": "POST endpoint works"}

@app.post("/api/users/debug")
async def debug_create_user(request_data: dict):
    """Debug endpoint to see raw data"""
    return {"received_data": request_data, "data_type": str(type(request_data))}

@app.post("/api/users/simple")
async def create_user_simple(request_data: dict):
    """Simple user creation without models"""
    try:
        print(f"DEBUG: Simple endpoint called with: {request_data}")
        from models import UserCreate
        user_data = UserCreate(**request_data)
        print(f"DEBUG: UserCreate object created: {user_data}")
        return {"status": "success", "data": request_data}
    except Exception as e:
        print(f"DEBUG: Error in simple endpoint: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.post("/api/users", response_model=UserResponse)
async def create_user(user_data: UserCreate):
    """Create a new user profile"""
    try:
        print(f"DEBUG: Endpoint called with user_data: {user_data}")
        print(f"DEBUG: user_data type: {type(user_data)}")
        print(f"DEBUG: user_data fields: {list(user_data.__dict__.keys())}")
        
        user = await create_user_service(user_data)
        return UserResponse(
            id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            profile_photo_url=user.profile_photo_url,
            age=user.age,
            gender=user.gender,
            about=user.about,
            price_range_min=user.price_range_min,
            price_range_max=user.price_range_max,
            metro_station=user.metro_station,
            search_radius=user.search_radius,
            latitude=user.location.coordinates[1],
            longitude=user.location.coordinates[0],
            created_at=user.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/users/me", response_model=UserResponse)
async def get_current_user(telegram_id: int = Query(...)):
    """Get current user profile by telegram_id"""
    user = await get_user_by_telegram_id_service(telegram_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        profile_photo_url=user.profile_photo_url,
        age=user.age,
        gender=user.gender,
        about=user.about,
        price_range_min=user.price_range_min,
        price_range_max=user.price_range_max,
        metro_station=user.metro_station,
        search_radius=user.search_radius,
        latitude=user.location.coordinates[1],
        longitude=user.location.coordinates[0],
        created_at=user.created_at
    )

@app.put("/api/users/me", response_model=UserResponse)
async def update_current_user(user_update: UserUpdate):
    """Update current user profile"""
    try:
        user = await update_user_service(user_update.telegram_id, user_update)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(
            id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            profile_photo_url=user.profile_photo_url,
            age=user.age,
            gender=user.gender,
            about=user.about,
            price_range_min=user.price_range_min,
            price_range_max=user.price_range_max,
            metro_station=user.metro_station,
            search_radius=user.search_radius,
            latitude=user.location.coordinates[1],
            longitude=user.location.coordinates[0],
            created_at=user.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/properties", response_model=List[PropertyResponse])
async def get_properties(telegram_id: int = Query(...)):
    """Get properties near user based on their location and search radius"""
    try:
        properties = await get_properties_near_user_service(telegram_id)
        return properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/matches", response_model=List[UserResponse])
async def get_matches(telegram_id: int = Query(...)):
    """Get potential matches for user"""
    try:
        matches = await get_potential_matches_service(telegram_id)
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/likes")
async def create_like(
    target_id: str, 
    target_type: str,  # "user" or "property"
    telegram_id: int = Query(...)
):
    """Create a like (user or property)"""
    try:
        # Get user
        user = await get_user_by_telegram_id_service(telegram_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        like = await create_like_service(user.id, target_id, target_type)
        
        # Check for match if liking a user
        match = None
        if target_type == "user":
            match = await check_match_service(user.id, target_id)
        
        return {
            "like_id": like.id,
            "match": match.id if match else None,
            "is_match": match is not None
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/user-matches", response_model=List[UserResponse])
async def get_user_matches(telegram_id: int = Query(...)):
    """Get confirmed matches for user"""
    try:
        matches = await get_user_matches_service(telegram_id)
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/liked-properties", response_model=List[PropertyResponse])
async def get_liked_properties(telegram_id: int = Query(...)):
    """Get properties liked by user"""
    try:
        properties = await get_user_liked_properties_service(telegram_id)
        return properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)