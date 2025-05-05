from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from typing import Optional


# === USER MODEL ===
class User(Document):
    username: str
    hashed_password: str
    is_admin: bool = False

    class Settings:
        name = "users"  # MongoDB collection name


# === AUTH REQUEST MODELS ===
class UserSignup(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


# === CALORIE TARGET MODEL ===
class CalorieTarget(Document):
    user_id: PydanticObjectId
    target: int

    class Settings:
        name = "targets"

    class Config:
        arbitrary_types_allowed = True


# === FOOD LOG MODEL (DATABASE) ===
class FoodLog(Document):
    user_id: PydanticObjectId
    name: str
    calories: int
    fat: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None

    class Settings:
        name = "foodlogs"

    class Config:
        arbitrary_types_allowed = True


# === FOOD LOG REQUEST MODEL (FROM FRONTEND) ===
class FoodLogCreate(BaseModel):
    name: str
    calories: int
    fat: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None


# === OPTIONAL: FOOD ITEM FOR READ-ONLY PURPOSES ===
class FoodItem(BaseModel):
    name: str
    calories: int
    fat: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None


# === RECIPE MODEL ===
class Recipe(BaseModel):
    title: str
    ingredients: str
    instructions: str
    food_id: Optional[str]
