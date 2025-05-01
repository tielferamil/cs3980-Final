from pymongo import MongoClient
from fastapi import HTTPException
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models import User, FoodLog, CalorieTarget

client = MongoClient(
    "mongodb+srv://tielferamil:KHp0Wvip8ohKtawk@cluster0.9mh9yk6.mongodb.net/nutritrack?retryWrites=true&w=majority"
)

db = client["nutritrack"]
users_collection = db["users"]
recipes_collection = db["recipes"]



async def init_db():
    client = AsyncIOMotorClient(
        "mongodb+srv://joewroble72:1usdVIXyJGkk77PG@cluster0.9mh9yk6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    )
    await init_beanie(database=client.nutritrack, document_models=[User, FoodLog, CalorieTarget])
    
