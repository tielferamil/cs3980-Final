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
    RecipeCreate,
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from database import init_db
from beanie import PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from database import recipes_collection
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional
from models import Goal, GoalCreate, GoalProgressUpdate
import asyncio


class ProfileUpdate(BaseModel):
    weight: Optional[float]
    height: Optional[float]


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
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


# Serve profile page
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


# Serve recipes page
@app.get("/recipes", response_class=HTMLResponse)
async def serve_recipes():
    with open("frontend/recipes.html", "r") as f:
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


# Posting recipes
@app.post("/recipes/")
async def create_recipe(recipe: RecipeCreate, user: User = Depends(get_current_user)):
    loop = asyncio.get_event_loop()
    recipe_dict = recipe.dict()
    recipe_dict["user_id"] = str(user.id)
    result = await loop.run_in_executor(
        None,
        lambda: recipes_collection.insert_one(recipe_dict)
    )
    return {"id": str(result.inserted_id)}


# Get all recipes
@app.get("/recipes/")
async def get_recipes(user: User = Depends(get_current_user)):
    cursor = recipes_collection.find({"user_id": str(user.id)})
    recipes = cursor.to_list(length=None)
    for r in recipes:
        r["_id"] = str(r["_id"])
    return recipes


# Get a recipe by ID
@app.get("/recipes/food/{food_id}")
async def get_recipe_by_food(food_id: str, user: User = Depends(get_current_user)):
    loop = asyncio.get_event_loop()
    recipe = await loop.run_in_executor(
        None,
        lambda: recipes_collection.find_one({"food_id": food_id, "user_id": str(user.id)})
    )
    if recipe:
        recipe["_id"] = str(recipe["_id"])
        return recipe
    raise HTTPException(status_code=404, detail="Recipe not found")


# admin page
@app.get("/admin", response_class=HTMLResponse)
async def serve_admin():
    with open("frontend/admin.html", "r") as f:
        return f.read()


# admin check
def require_admin(user: User):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")


# Admin routes
@app.get("/admin/users")
async def get_users(user: User = Depends(get_current_user)):
    require_admin(user)
    users = await User.find_all().to_list()
    return [{"username": user.username, "is_admin": user.is_admin} for user in users]


# admin promotion
@app.put("/admin/promote/{username}")
async def promote_user(username: str, user: User = Depends(get_current_user)):
    require_admin(user)
    target = await User.find_one(User.username == username)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_admin = True
    await target.save()
    return {"message": f"User {username} promoted to admin"}


# admin check route
@app.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"username": user.username, "is_admin": user.is_admin}



@app.put("/recipes/food/{food_id}")
async def update_recipe_by_food(food_id: str, recipe: RecipeCreate, user: User = Depends(get_current_user)):
    loop = asyncio.get_event_loop()
    existing = await loop.run_in_executor(
        None,
        lambda: recipes_collection.find_one({"food_id": food_id, "user_id": str(user.id)})
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")

    updated = {
        "food_id": food_id,
        "user_id": str(user.id),
        "name": recipe.name,
        "ingredients": recipe.ingredients,
        "instructions": recipe.instructions,
    }

    await loop.run_in_executor(
        None,
        lambda: recipes_collection.replace_one({"_id": existing["_id"]}, updated)
    )
    return {"message": "Recipe updated"}




@app.post("/goals/create")
async def create_goal(goal: GoalCreate, user: User = Depends(get_current_user)):
    new_goal = Goal(
        user_id=user.id,
        type=goal.type,
        title=goal.title,
        targetValue=goal.targetValue,
        currentValue=goal.currentValue,
        measurementUnit=goal.measurementUnit,
        targetDate=goal.targetDate,
        notes=goal.notes,
        progress=(
            int((goal.currentValue / goal.targetValue) * 100)
            if goal.targetValue > 0
            else 0
        ),
        completed=False,
    )
    await new_goal.insert()
    return {"message": "Goal created successfully", "id": str(new_goal.id)}


# Get all goals for the current user
@app.get("/goals/list")
async def get_goals(user: User = Depends(get_current_user)):
    goals = await Goal.find(Goal.user_id == user.id).to_list()
    return [
        {
            "_id": str(goal.id),
            "type": goal.type,
            "title": goal.title,
            "targetValue": goal.targetValue,
            "currentValue": goal.currentValue,
            "measurementUnit": goal.measurementUnit,
            "targetDate": goal.targetDate,
            "notes": goal.notes,
            "progress": goal.progress,
            "completed": goal.completed,
        }
        for goal in goals
    ]


# Update goal progress
@app.put("/goals/{goal_id}/progress")
async def update_goal_progress(
    goal_id: PydanticObjectId,
    progress_update: GoalProgressUpdate,
    user: User = Depends(get_current_user),
):
    goal = await Goal.get(goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.currentValue = progress_update.currentValue
    goal.progress = progress_update.progress
    goal.completed = progress_update.completed
    await goal.save()
    return {"message": "Goal progress updated"}


# Update goal details
@app.put("/goals/{goal_id}")
async def update_goal(
    goal_id: PydanticObjectId,
    goal_update: GoalCreate,
    user: User = Depends(get_current_user),
):
    goal = await Goal.get(goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.type = goal_update.type
    goal.title = goal_update.title
    goal.targetValue = goal_update.targetValue
    goal.measurementUnit = goal_update.measurementUnit
    goal.targetDate = goal_update.targetDate
    goal.notes = goal_update.notes
    # Recalculate progress with new target value
    goal.progress = (
        int((goal.currentValue / goal.targetValue) * 100) if goal.targetValue > 0 else 0
    )
    goal.completed = goal.progress >= 100
    await goal.save()
    return {"message": "Goal updated"}


# Delete goal
@app.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: PydanticObjectId, user: User = Depends(get_current_user)
):
    goal = await Goal.get(goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    await goal.delete()
    return {"message": "Goal deleted"}
