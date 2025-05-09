from beanie import Document, PydanticObjectId
from pydantic import BaseModel
from typing import Optional, List


# === USER MODEL ===
class User(Document):
    username: str
    hashed_password: str
    is_admin: bool = False  # Added from repo version
    weight: Optional[float] = None  # in kilograms
    height: Optional[float] = None
    profile_picture: Optional[str] = None

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


# === FOOD ITEM FOR READ-ONLY PURPOSES ===
class FoodItem(BaseModel):
    name: str
    calories: int
    fat: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None


# === RECIPE MODELS ===
class RecipeCreate(BaseModel):
    food_id: str
    name: str
    ingredients: List[str]
    instructions: str


# === RECIPE MODEL ===
class Recipe(RecipeCreate):
    user_id: PydanticObjectId


# === GOAL MODEL ===
class Goal(Document):
    user_id: PydanticObjectId
    type: str  # 'weight', 'nutrition', 'exercise', 'water', 'custom'
    title: str
    targetValue: float
    currentValue: float = 0.0
    measurementUnit: str
    targetDate: str
    notes: Optional[str] = None
    progress: int = 0  # 0-100 percentage
    completed: bool = False

    class Settings:
        name = "goals"

    class Config:
        arbitrary_types_allowed = True


# === GOAL CREATE/UPDATE REQUEST MODEL ===
class GoalCreate(BaseModel):
    type: str
    title: str
    targetValue: float
    currentValue: float = 0.0
    measurementUnit: str
    targetDate: str
    notes: Optional[str] = None


# === GOAL PROGRESS UPDATE MODEL ===
class GoalProgressUpdate(BaseModel):
    currentValue: float
    progress: int
    completed: bool = False
