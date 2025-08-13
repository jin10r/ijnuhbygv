from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class Location(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    telegram_id: int
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    age: int
    gender: str  # "male", "female"
    about: Optional[str] = None  # О себе
    price_range_min: int
    price_range_max: int
    metro_station: str
    search_radius: int  # in kilometers
    location: Location
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class Property(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    price: int
    address: str
    metro_station: str
    location: Location
    rooms: int
    area: float  # square meters
    floor: int
    total_floors: int
    property_type: str  # "apartment", "room", "studio"
    photos: List[str] = []
    amenities: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class Like(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    target_id: str  # can be user_id or property_id
    target_type: str  # "user" or "property"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user1_id: str
    user2_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

# Request/Response models
class UserCreate(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    age: int
    gender: str  # "male", "female"
    about: Optional[str] = None  # О себе
    price_range_min: int
    price_range_max: int
    metro_station: str
    search_radius: int
    latitude: float
    longitude: float

class UserUpdate(BaseModel):
    telegram_id: int
    age: Optional[int] = None
    gender: Optional[str] = None  # "male", "female"
    about: Optional[str] = None
    price_range_min: Optional[int] = None
    price_range_max: Optional[int] = None
    metro_station: Optional[str] = None
    search_radius: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PropertyResponse(BaseModel):
    id: str
    title: str
    description: str
    price: int
    address: str
    metro_station: str
    latitude: float
    longitude: float
    rooms: int
    area: float
    floor: int
    total_floors: int
    property_type: str
    photos: List[str]
    amenities: List[str]
    created_at: datetime
    is_liked: bool = False

class UserResponse(BaseModel):
    id: str
    username: Optional[str]
    first_name: str
    last_name: Optional[str]
    profile_photo_url: Optional[str]
    age: int
    gender: Optional[str] = None  # "male", "female" - optional for backward compatibility
    about: Optional[str] = None  # О себе
    price_range_min: int
    price_range_max: int
    metro_station: str
    search_radius: int
    latitude: float
    longitude: float
    created_at: datetime
    is_liked: bool = False
