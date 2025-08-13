from typing import List, Optional
from models import User, UserCreate, UserUpdate, UserResponse, Property, PropertyResponse, Like, Match, Location
from database import get_users_collection, get_properties_collection, get_likes_collection, get_matches_collection
import uuid
from datetime import datetime

async def create_user_service(user_data: UserCreate) -> User:
    """Create a new user"""
    try:
        print(f"DEBUG: create_user_service called with: {user_data}")
        print(f"DEBUG: user_data type: {type(user_data)}")
        print(f"DEBUG: user_data fields: {list(user_data.__dict__.keys())}")
        
        users_collection = get_users_collection()
        print("DEBUG: Got users collection")
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"telegram_id": user_data.telegram_id})
        print(f"DEBUG: Checked existing user: {existing_user}")
        if existing_user:
            raise ValueError("User already exists")
        
        print("DEBUG: Creating User object...")
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
        print(f"DEBUG: User object created: {user}")
        
        # Insert to database
        print("DEBUG: Inserting to database...")
        await users_collection.insert_one(user.model_dump())
        print("DEBUG: Inserted successfully")
        return user
        
    except Exception as e:
        print(f"DEBUG: Exception in create_user_service: {e}")
        import traceback
        traceback.print_exc()
        raise

async def get_user_by_telegram_id_service(telegram_id: int) -> Optional[User]:
    """Get user by telegram_id"""
    users_collection = get_users_collection()
    user_data = await users_collection.find_one({"telegram_id": telegram_id})
    if user_data:
        return User(**user_data)
    return None

import logging

async def update_user_service(telegram_id: int, user_update: UserUpdate) -> Optional[User]:
    """Update user profile"""
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Updating user {telegram_id} with data: {user_update.model_dump()}")
    users_collection = get_users_collection()
    
    update_data = {}
    if user_update.age is not None:
        update_data["age"] = user_update.age
    if user_update.gender is not None:
        update_data["gender"] = user_update.gender
    if user_update.about is not None:
        update_data["about"] = user_update.about
    if user_update.price_range_min is not None:
        update_data["price_range_min"] = user_update.price_range_min
    if user_update.price_range_max is not None:
        update_data["price_range_max"] = user_update.price_range_max
    if user_update.metro_station is not None:
        update_data["metro_station"] = user_update.metro_station
    if user_update.search_radius is not None:
        update_data["search_radius"] = user_update.search_radius
    if user_update.latitude is not None and user_update.longitude is not None:
        update_data["location"] = Location(coordinates=[user_update.longitude, user_update.latitude]).model_dump()
    
    if update_data:
        await users_collection.update_one(
            {"telegram_id": telegram_id},
            {"$set": update_data}
        )
    
    return await get_user_by_telegram_id_service(telegram_id)

async def get_properties_near_user_service(telegram_id: int) -> List[PropertyResponse]:
    """Get properties near user based on location and search radius"""
    users_collection = get_users_collection()
    properties_collection = get_properties_collection()
    likes_collection = get_likes_collection()
    
    # Get user
    user = await get_user_by_telegram_id_service(telegram_id)
    if not user:
        return []
    
    # Get user's liked properties
    user_likes = await likes_collection.find({
        "user_id": user.id,
        "target_type": "property"
    }).to_list(length=None)
    liked_property_ids = {like["target_id"] for like in user_likes}
    
    # Find properties within user's search radius
    search_radius_meters = user.search_radius * 1000  # Convert km to meters
    
    # MongoDB geospatial query
    pipeline = [
        {
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": user.location.coordinates
                },
                "distanceField": "distance",
                "maxDistance": search_radius_meters,
                "spherical": True
            }
        },
        {
            "$match": {
                "is_active": True,
                "price": {
                    "$gte": user.price_range_min,
                    "$lte": user.price_range_max
                }
            }
        }
    ]
    
    properties = await properties_collection.aggregate(pipeline).to_list(length=None)
    
    result = []
    for prop in properties:
        property_response = PropertyResponse(
            id=prop["id"],
            title=prop["title"],
            description=prop["description"],
            price=prop["price"],
            address=prop["address"],
            metro_station=prop["metro_station"],
            latitude=prop["location"]["coordinates"][1],
            longitude=prop["location"]["coordinates"][0],
            rooms=prop["rooms"],
            area=prop["area"],
            floor=prop["floor"],
            total_floors=prop["total_floors"],
            property_type=prop["property_type"],
            photos=prop.get("photos", []),
            amenities=prop.get("amenities", []),
            created_at=prop["created_at"],
            is_liked=prop["id"] in liked_property_ids
        )
        result.append(property_response)
    
    return result

async def get_potential_matches_service(telegram_id: int) -> List[UserResponse]:
    """Get potential matches for user (users with overlapping search areas)"""
    users_collection = get_users_collection()
    likes_collection = get_likes_collection()
    
    # Get current user
    user = await get_user_by_telegram_id_service(telegram_id)
    if not user:
        return []
    
    # Get user's likes
    user_likes = await likes_collection.find({
        "user_id": user.id,
        "target_type": "user"
    }).to_list(length=None)
    liked_user_ids = {like["target_id"] for like in user_likes}
    
    # Find users within search radius who also have overlapping search areas
    search_radius_meters = user.search_radius * 1000
    
    pipeline = [
        {
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": user.location.coordinates
                },
                "distanceField": "distance",
                "maxDistance": search_radius_meters,
                "spherical": True
            }
        },
        {
            "$match": {
                "telegram_id": {"$ne": user.telegram_id},
                "is_active": True,
                # Price range overlap
                "$or": [
                    {
                        "price_range_min": {"$lte": user.price_range_max},
                        "price_range_max": {"$gte": user.price_range_min}
                    }
                ]
            }
        }
    ]
    
    potential_matches = await users_collection.aggregate(pipeline).to_list(length=None)
    
    result = []
    for match_user in potential_matches:
        # Check if the other user's search radius also includes current user
        other_user_radius = match_user["search_radius"] * 1000
        if match_user.get("distance", 0) <= other_user_radius:
            user_response = UserResponse(
                id=match_user["id"],
                username=match_user.get("username"),
                first_name=match_user["first_name"],
                last_name=match_user.get("last_name"),
                profile_photo_url=match_user.get("profile_photo_url"),
                age=match_user["age"],
                gender=match_user.get("gender"),
                about=match_user.get("about"),
                price_range_min=match_user["price_range_min"],
                price_range_max=match_user["price_range_max"],
                metro_station=match_user["metro_station"],
                search_radius=match_user["search_radius"],
                latitude=match_user["location"]["coordinates"][1],
                longitude=match_user["location"]["coordinates"][0],
                created_at=match_user["created_at"],
                is_liked=match_user["id"] in liked_user_ids
            )
            result.append(user_response)
    
    return result

async def create_like_service(user_id: str, target_id: str, target_type: str) -> Like:
    """Create a like"""
    likes_collection = get_likes_collection()
    
    # Check if like already exists
    existing_like = await likes_collection.find_one({
        "user_id": user_id,
        "target_id": target_id,
        "target_type": target_type
    })
    
    if existing_like:
        raise ValueError("Like already exists")
    
    like = Like(
        user_id=user_id,
        target_id=target_id,
        target_type=target_type
    )
    
    await likes_collection.insert_one(like.model_dump())
    return like

async def check_match_service(user1_id: str, user2_id: str) -> Optional[Match]:
    """Check if there's a mutual like and create match"""
    likes_collection = get_likes_collection()
    matches_collection = get_matches_collection()
    
    # Check if both users liked each other
    like1 = await likes_collection.find_one({
        "user_id": user1_id,
        "target_id": user2_id,
        "target_type": "user"
    })
    
    like2 = await likes_collection.find_one({
        "user_id": user2_id,
        "target_id": user1_id,
        "target_type": "user"
    })
    
    if like1 and like2:
        # Check if match already exists
        existing_match = await matches_collection.find_one({
            "$or": [
                {"user1_id": user1_id, "user2_id": user2_id},
                {"user1_id": user2_id, "user2_id": user1_id}
            ]
        })
        
        if not existing_match:
            match = Match(
                user1_id=user1_id,
                user2_id=user2_id
            )
            await matches_collection.insert_one(match.model_dump())
            return match
        else:
            return Match(**existing_match)
    
    return None

async def get_user_matches_service(telegram_id: int) -> List[UserResponse]:
    """Get confirmed matches for user"""
    users_collection = get_users_collection()
    matches_collection = get_matches_collection()
    likes_collection = get_likes_collection()
    
    # Get user
    user = await get_user_by_telegram_id_service(telegram_id)
    if not user:
        return []
    
    # Get matches
    matches = await matches_collection.find({
        "$or": [
            {"user1_id": user.id},
            {"user2_id": user.id}
        ],
        "is_active": True
    }).to_list(length=None)
    
    # Get user's likes for matched users
    user_likes = await likes_collection.find({
        "user_id": user.id,
        "target_type": "user"
    }).to_list(length=None)
    liked_user_ids = {like["target_id"] for like in user_likes}
    
    result = []
    for match in matches:
        # Get the other user's ID
        other_user_id = match["user2_id"] if match["user1_id"] == user.id else match["user1_id"]
        
        # Get other user's data
        other_user_data = await users_collection.find_one({"id": other_user_id})
        if other_user_data:
            user_response = UserResponse(
                id=other_user_data["id"],
                username=other_user_data.get("username"),
                first_name=other_user_data["first_name"],
                last_name=other_user_data.get("last_name"),
                profile_photo_url=other_user_data.get("profile_photo_url"),
                age=other_user_data["age"],
                gender=other_user_data.get("gender"),
                about=other_user_data.get("about"),
                price_range_min=other_user_data["price_range_min"],
                price_range_max=other_user_data["price_range_max"],
                metro_station=other_user_data["metro_station"],
                search_radius=other_user_data["search_radius"],
                latitude=other_user_data["location"]["coordinates"][1],
                longitude=other_user_data["location"]["coordinates"][0],
                created_at=other_user_data["created_at"],
                is_liked=other_user_data["id"] in liked_user_ids
            )
            result.append(user_response)
    
    return result

async def get_user_liked_properties_service(telegram_id: int) -> List[PropertyResponse]:
    """Get properties liked by user"""
    properties_collection = get_properties_collection()
    likes_collection = get_likes_collection()
    
    # Get user
    user = await get_user_by_telegram_id_service(telegram_id)
    if not user:
        return []
    
    # Get liked properties
    likes = await likes_collection.find({
        "user_id": user.id,
        "target_type": "property"
    }).to_list(length=None)
    
    property_ids = [like["target_id"] for like in likes]
    
    if not property_ids:
        return []
    
    # Get properties
    properties = await properties_collection.find({
        "id": {"$in": property_ids},
        "is_active": True
    }).to_list(length=None)
    
    result = []
    for prop in properties:
        property_response = PropertyResponse(
            id=prop["id"],
            title=prop["title"],
            description=prop["description"],
            price=prop["price"],
            address=prop["address"],
            metro_station=prop["metro_station"],
            latitude=prop["location"]["coordinates"][1],
            longitude=prop["location"]["coordinates"][0],
            rooms=prop["rooms"],
            area=prop["area"],
            floor=prop["floor"],
            total_floors=prop["total_floors"],
            property_type=prop["property_type"],
            photos=prop.get("photos", []),
            amenities=prop.get("amenities", []),
            created_at=prop["created_at"],
            is_liked=True
        )
        result.append(property_response)
    
    return result