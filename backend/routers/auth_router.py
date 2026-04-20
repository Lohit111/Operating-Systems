import uuid
from datetime import datetime

import bcrypt
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError

from backend.database import get_users_collection
from backend.models import AuthRequest, AuthResponse

router = APIRouter()


@router.post("/auth", response_model=AuthResponse)
async def auth(request: AuthRequest):
    users = get_users_collection()
    email = request.email
    password = request.password

    if request.action == "register":
        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
        uid = str(uuid.uuid4())
        user_doc = {
            "uid": uid,
            "email": email,
            "password": hashed_pw.decode(),
            "lastHead": 0,
            "createdAt": datetime.utcnow(),
        }
        try:
            await users.insert_one(user_doc)
        except DuplicateKeyError:
            raise HTTPException(status_code=400, detail="Email already registered")
        return AuthResponse(uid=uid, lastHead=0)

    elif request.action == "login":
        user = await users.find_one({"email": email})
        if not user or not bcrypt.checkpw(password.encode(), user["password"].encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return AuthResponse(uid=user["uid"], lastHead=user["lastHead"])
