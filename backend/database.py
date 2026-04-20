from motor.motor_asyncio import AsyncIOMotorClient


MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "operating_systems"

client: AsyncIOMotorClient = None

def get_database():
    return client[DB_NAME]

def get_users_collection():
    return get_database()["users"]

def get_files_collection():
    return get_database()["files"]

async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI)
    # Create indexes
    db = get_database()
    await db["users"].create_index("email", unique=True)
    await db["files"].create_index([("uid", 1), ("filename", 1)], unique=True)

async def disconnect_db():
    global client
    if client:
        client.close()
