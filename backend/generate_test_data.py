import asyncio
import random
from faker import Faker
import motor.motor_asyncio
from models import User, Property, Location
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

fake = Faker('ru_RU')

# Moscow coordinates bounds
MOSCOW_BOUNDS = {
    'lat_min': 55.5900,
    'lat_max': 55.8700,
    'lng_min': 37.3200,
    'lng_max': 37.8400
}

# Moscow metro stations
METRO_STATIONS = [
    "Сокольники", "Красносельская", "Комсомольская", "Красные ворота", "Чистые пруды",
    "Лубянка", "Охотный ряд", "Библиотека им. Ленина", "Кропоткинская", "Парк культуры",
    "Фрунзенская", "Спортивная", "Воробьевы горы", "Университет", "Проспект Вернадского",
    "Юго-Западная", "Тропарево", "Румянцево", "Саларьево", "Бульвар Дмитрия Донского",
    "Речной вокзал", "Водный стадион", "Войковская", "Сокол", "Аэропорт",
    "Белорусская", "Маяковская", "Тверская", "Театральная", "Новокузнецкая",
    "Павелецкая", "Автозаводская", "Технопарк", "Коломенская", "Каширская",
    "Кантемировская", "Царицыно", "Орехово", "Домодедовская", "Красногвардейская",
    "Алма-Атинская", "Новокосино", "Новогиреево", "Перово", "Шоссе Энтузиастов",
    "Авиамоторная", "Площадь Ильича", "Марксистская", "Третьяковская", "Октябрьская",
    "Парк культуры", "Киевская", "Смоленская", "Арбатская", "Александровский сад"
]

PROPERTY_TYPES = ["apartment", "room", "studio"]
AMENITIES = [
    "WiFi", "Кондиционер", "Стиральная машина", "Посудомоечная машина", 
    "Балкон", "Лоджия", "Парковка", "Лифт", "Консьерж", "Охрана",
    "Мебель", "Техника", "Интернет", "Кабельное ТВ"
]



async def connect_to_database():
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/roommate_app")
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    return client.roommate_app

def generate_moscow_coordinates():
    """Generate random coordinates within Moscow bounds"""
    lat = random.uniform(MOSCOW_BOUNDS['lat_min'], MOSCOW_BOUNDS['lat_max'])
    lng = random.uniform(MOSCOW_BOUNDS['lng_min'], MOSCOW_BOUNDS['lng_max'])
    return lat, lng

def generate_user_data():
    """Generate fake user data"""
    lat, lng = generate_moscow_coordinates()
    
    return User(
        id=str(uuid.uuid4()),
        telegram_id=random.randint(1000000000, 9999999999),
        username=fake.user_name(),
        first_name=fake.first_name(),
        last_name=fake.last_name(),
        profile_photo_url=f"https://picsum.photos/150/150?random={random.randint(1, 1000)}",
        age=random.randint(18, 45),
        gender=random.choice(["male", "female"]),
        about=fake.text(max_nb_chars=200) if random.choice([True, False]) else None,

        price_range_min=random.randint(500, 8000),
        price_range_max=random.randint(8000, 25000),
        metro_station=random.choice(METRO_STATIONS),
        search_radius=random.randint(3, 15),
        location=Location(coordinates=[lng, lat]),
        created_at=fake.date_time_between(start_date='-1y', end_date='now'),
        is_active=True
    )

def generate_property_data():
    """Generate fake property data"""
    lat, lng = generate_moscow_coordinates()
    rooms = random.randint(1, 4)
    
    property_type = random.choice(PROPERTY_TYPES)
    if property_type == "studio":
        rooms = 1
    
    floor = random.randint(1, 25)
    total_floors = max(floor, random.randint(floor, 25))
    
    # Generate realistic price based on rooms and area
    area = random.randint(25, 120)
    base_price = random.randint(500, 25000)
    if property_type == "room":
        base_price = random.randint(500, 15000)
    elif property_type == "studio":
        base_price = random.randint(500, 20000)
    
    return Property(
        id=str(uuid.uuid4()),
        title=f"{rooms}-комнатная {property_type} у метро {random.choice(METRO_STATIONS)}",
        description=fake.text(max_nb_chars=300),
        price=base_price,
        address=fake.address(),
        metro_station=random.choice(METRO_STATIONS),
        location=Location(coordinates=[lng, lat]),
        rooms=rooms,
        area=area,
        floor=floor,
        total_floors=total_floors,
        property_type=property_type,
        photos=[
            f"https://picsum.photos/400/300?random={random.randint(1, 1000)}" 
            for _ in range(random.randint(1, 5))
        ],
        amenities=random.sample(AMENITIES, random.randint(2, 8)),
        created_at=fake.date_time_between(start_date='-6m', end_date='now'),
        is_active=True
    )

async def generate_test_data(num_users=1000, num_properties=1000, force=False):
    """Generate and insert test data"""
    db = await connect_to_database()
    
    if force:
        print("🧹 --force flag detected. Deleting existing data...")
        await db.users.delete_many({})
        await db.properties.delete_many({})
        await db.likes.delete_many({})
        await db.matches.delete_many({})
        print("🗑️  Existing data deleted.")

    # Check if data already exists
    existing_users = await db.users.count_documents({})
    existing_properties = await db.properties.count_documents({})
    
    if existing_users > 0 or existing_properties > 0:
        print(f"📊 База данных уже содержит {existing_users} пользователей и {existing_properties} объявлений")
        print("✅ Пропускаем генерацию тестовых данных")
        return
    
    print(f"Generating test data for {num_users} users and {num_properties} properties...")
    
    # Generate users
    print(f"Generating {num_users} users...")
    users = []
    telegram_ids = set()  # Ensure unique telegram_ids
    
    for i in range(num_users):
        user = generate_user_data()
        # Ensure unique telegram_id
        while user.telegram_id in telegram_ids:
            user.telegram_id = random.randint(1000000000, 9999999999)
        telegram_ids.add(user.telegram_id)
        
        users.append(user.model_dump())
        if (i + 1) % 100 == 0:
            print(f"Generated {i + 1} users")
    
    # Insert users
    print("Inserting users to database...")
    result = await db.users.insert_many(users)
    print(f"Successfully inserted {len(result.inserted_ids)} users")
    
    # Generate properties
    print(f"Generating {num_properties} properties...")
    properties = []
    for i in range(num_properties):
        property_data = generate_property_data()
        properties.append(property_data.model_dump())
        if (i + 1) % 100 == 0:
            print(f"Generated {i + 1} properties")
    
    # Insert properties
    print("Inserting properties to database...")
    result = await db.properties.insert_many(properties)
    print(f"Successfully inserted {len(result.inserted_ids)} properties")
    
    # Create indexes
    print("Creating database indexes...")
    await db.users.create_index([("location", "2dsphere")])
    await db.properties.create_index([("location", "2dsphere")])
    await db.users.create_index("telegram_id", unique=True)
    await db.users.create_index("created_at")
    await db.properties.create_index("created_at")
    await db.properties.create_index("price")
    await db.properties.create_index("metro_station")
    
    print("Test data generation completed!")
    print(f"✅ Generated {len(users)} users and {len(properties)} properties")
    print("🗄️  Database indexes created")
    print("🎯 Ready for testing!")

async def main():
    import argparse

    parser = argparse.ArgumentParser(description="Generate test data for the roommate app.")
    parser.add_argument("--users", type=int, default=1000, help="Number of users to generate.")
    parser.add_argument("--properties", type=int, default=1000, help="Number of properties to generate.")
    parser.add_argument("--force", action="store_true", help="Force regeneration, deleting existing data.")
    
    args = parser.parse_args()

    await generate_test_data(num_users=args.users, num_properties=args.properties, force=args.force)

if __name__ == "__main__":
    asyncio.run(main())