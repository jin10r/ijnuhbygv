import os
import asyncio
import motor.motor_asyncio
from dotenv import load_dotenv
from services import get_properties_near_user_service
from database import connect_to_mongo, close_mongo_connection

load_dotenv()

async def main():
    print("--- Testing API call for properties ---")
    
    try:
        # Initialize MongoDB connection
        await connect_to_mongo()
        
        # Get database connection
        client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("MONGO_URL"))
        db = client.roommate_app
        users_collection = db.users
        
        # Find a user with a complete profile for testing
        test_user = await users_collection.find_one({
            "metro_station": {"$exists": True},
            "location": {"$exists": True}
        })
        
        if not test_user:
            print("❌ No suitable test user found with location data.")
            await close_mongo_connection()
            return
            
        telegram_id = test_user['telegram_id']
        print(f"✅ Found test user: {telegram_id}")
        print(f"   Metro: {test_user.get('metro_station', 'N/A')}")
        print(f"   Budget: {test_user.get('price_range_min', 'N/A')}-{test_user.get('price_range_max', 'N/A')}")
        print(f"   Radius: {test_user.get('search_radius', 'N/A')} km")
        
        # Call the service function that the API uses
        print("\n--- Calling get_properties_near_user_service ---")
        try:
            properties = await get_properties_near_user_service(telegram_id)
            print(f">>> API returned {len(properties)} properties")
        except Exception as e:
            print(f"❌ Error in get_properties_near_user_service: {e}")
            import traceback
            traceback.print_exc()
            await close_mongo_connection()
            return
        
        if len(properties) > 0:
            print("\nFirst few properties returned:")
            for i, prop in enumerate(properties[:3]):
                print(f"  {i+1}. {prop.title} - {prop.price}₽ at {prop.address}")
        else:
            print("⚠️  API returned an empty list. No properties found.")
            
        # Close MongoDB connection
        await close_mongo_connection()
            
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        import traceback
        traceback.print_exc()
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
