from pymongo import MongoClient
from fastapi import HTTPException
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models import User

client = MongoClient(
    "mongodb+srv://tielferamil:KHp0Wvip8ohKtawk@cluster0.9mh9yk6.mongodb.net/"
)
db = client["nutritrack"]
users_collection = db["users"]


async def init_db():
    client = AsyncIOMotorClient("mongodb+srv://<db_username>:<db_password>@cluster0.9mh9yk6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    await init_beanie(database=client.nutritrack, document_models=[User])
