from beanie import Document
from pydantic import BaseModel
from typing import Optional
from beanie import PydanticObjectId


# User document stored in MongoDB
class User(Document):
    username: str
    hashed_password: str
    is_admin: bool = False

    class Settings:
        name = "users"  # MongoDB collection name


# Request schemas (not stored directly)
class UserSignup(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


# A food item from frontend
class FoodItem(BaseModel):
    name: str
    calories: int

class CalorieTarget(Document):
    user_id: PydanticObjectId
    target: int

    class Settings:
        name = "targets"

    class Config:
        arbitrary_types_allowed = True


# Food log stored per user
class FoodLog(Document):
    user_id: PydanticObjectId
    name: str
    calories: int

    class Settings:
        name = "foodlogs"# MongoDB collection name

    class Config:
        arbitrary_types_allowed = True

# Recipe document stored in MongoDB
class Recipe(BaseModel):
    title: str
    ingredients: str
    instructions: str
    food_id: Optional[str] 

