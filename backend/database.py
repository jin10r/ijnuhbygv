import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/roommate_app")

client: AsyncIOMotorClient = None

async def connect_to_mongo():
    global client
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        client = None

async def close_mongo_connection():
    global client
    if client:
        client.close()
        client = None

def get_database():
    global client
    if client is None:
        raise Exception("MongoDB client is not initialized. Call connect_to_mongo() first.")
    db_name = os.getenv("MONGODB_DB_NAME", "roommate_app")
    return getattr(client, db_name)

def get_users_collection():
    db = get_database()
    return db.users

def get_properties_collection():
    db = get_database()
    return db.properties

def get_likes_collection():
    db = get_database()
    return db.likes

def get_matches_collection():
    db = get_database()
    return db.matches

async def create_indexes():
    """Create necessary indexes for geospatial queries"""
    users_collection = get_users_collection()
    properties_collection = get_properties_collection()
    likes_collection = get_likes_collection()
    
    # Create geospatial indexes
    await users_collection.create_index([("location", "2dsphere")])
    await properties_collection.create_index([("location", "2dsphere")])
    
    # Create regular indexes
    await users_collection.create_index("telegram_id", unique=True)
    await likes_collection.create_index([("user_id", 1), ("target_id", 1), ("target_type", 1)], unique=True)
    await users_collection.create_index("created_at")
    await properties_collection.create_index("created_at")
    