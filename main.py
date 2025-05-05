from fastapi import FastAPI, HTTPException, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from models import (
    UserSignup,
    UserLogin,
    User,
    FoodItem,
    FoodLog,
    FoodLogCreate,
    CalorieTarget,
    Recipe,
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from database import init_db
from beanie import PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from database import recipes_collection
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional


class ProfileUpdate(BaseModel):
    weight: Optional[float]
    height: Optional[float]


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


# Load frontend pages
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open("frontend/index.html", "r") as f:
        return f.read()


@app.get("/goals", response_class=HTMLResponse)
async def serve_goals():
    with open("frontend/goals.html", "r") as f:
        return f.read()


@app.get("/recipes", response_class=HTMLResponse)
async def serve_recipes():
    with open("frontend/recipes.html", "r") as f:
        return f.read()


@app.get("/profile", response_class=HTMLResponse)
async def serve_profile():
    with open("frontend/profile.html", "r") as f:
        return f.read()


@app.get("/profile-data")
async def get_profile_data(user: User = Depends(get_current_user)):
    log_count = await FoodLog.find(FoodLog.user_id == user.id).count()
    target_doc = await CalorieTarget.find_one(CalorieTarget.user_id == user.id)
    target = target_doc.target if target_doc else None

    # Calculate BMI if height and weight are available
    bmi = None
    if user.weight and user.height and user.height > 0:
        bmi = round(user.weight / (user.height**2), 2)

    return {
        "username": user.username,
        "logCount": log_count,
        "target": target,
        "weight": user.weight,
        "height": user.height,
        "bmi": bmi,
    }


@app.post("/profile-data")
async def update_profile(data: ProfileUpdate, user: User = Depends(get_current_user)):
    if data.weight:
        user.weight = data.weight
    if data.height:
        user.height = data.height
    await user.save()
    return {"message": "Profile updated"}


@app.get("/login", response_class=HTMLResponse)
async def serve_login():
    with open("frontend/login.html", "r") as f:
        return f.read()


# DB Init
@app.on_event("startup")
async def start_db():
    await init_db()


# Signup Route
@app.post("/signup")
async def signup(user: UserSignup):
    existing = await User.find_one(User.username == user.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = hash_password(user.password)
    new_user = User(username=user.username, hashed_password=hashed)
    await new_user.insert()
    return {"message": "User created"}


# Login Route
@app.post("/login")
async def login(user: UserLogin):
    db_user = await User.find_one(User.username == user.username)
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(db_user.id)})
    return {"access_token": token, "token_type": "bearer"}


# Log Food (authenticated)
@app.post("/calories/log")
async def log_food(food: FoodLogCreate, user: User = Depends(get_current_user)):
    log = FoodLog(
        user_id=user.id,
        name=food.name,
        calories=food.calories,
        fat=food.fat,
        protein=food.protein,
        carbs=food.carbs,
    )
    await log.insert()
    return {"message": "Food logged"}


# Get Food Logs + Total + target (authenticated)
@app.get("/calories")
async def get_calories(user: User = Depends(get_current_user)):
    logs = await FoodLog.find(FoodLog.user_id == user.id).to_list()
    total = sum(item.calories for item in logs)

    target_doc = await CalorieTarget.find_one(CalorieTarget.user_id == user.id)
    target = target_doc.target if target_doc else 0

    return {
        "totalCalories": total,
        "foods": [
            {
                "name": item.name,
                "calories": item.calories,
                "fat": item.fat,
                "protein": item.protein,
                "carbs": item.carbs,
                "_id": str(item.id),
            }
            for item in logs
        ],
        "target": target,
    }


# Set daily target (authenticated)
@app.post("/calories/target")
async def set_target(target: int = Body(...), user: User = Depends(get_current_user)):
    existing = await CalorieTarget.find_one(CalorieTarget.user_id == user.id)
    if existing:
        existing.target = target
        await existing.save()
    else:
        await CalorieTarget(user_id=user.id, target=target).insert()
    return {"message": "Target set"}


@app.put("/calories/log/{log_id}")
async def update_log(
    log_id: PydanticObjectId, food: FoodItem, user: User = Depends(get_current_user)
):
    log = await FoodLog.get(log_id)
    if not log or log.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    log.name = food.name
    log.calories = food.calories
    await log.save()
    return {"message": "Food log updated"}


# Delete Food Log by ID
@app.delete("/calories/log/{log_id}")
async def delete_log(log_id: PydanticObjectId, user: User = Depends(get_current_user)):
    log = await FoodLog.get(log_id)
    if not log or log.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    await log.delete()
    return {"message": "Deleted"}


@app.post("/recipes/")
async def create_recipe(recipe: Recipe):
    recipe_dict = recipe.dict()
    result = recipes_collection.insert_one(recipe_dict)
    return {"id": str(result.inserted_id)}


@app.get("/recipes/")
async def get_recipes():
    recipes = []
    for r in recipes_collection.find():
        r["_id"] = str(r["_id"])
        recipes.append(r)
    return recipes


@app.get("/recipes/food/{food_id}")
async def get_recipe_by_food(food_id: str):
    recipe = recipes_collection.find_one({"food_id": food_id})
    if recipe:
        recipe["_id"] = str(recipe["_id"])
        return recipe
    raise HTTPException(status_code=404, detail="Recipe not found")
