from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.database import get_users_collection
from backend.models import UserResponse

router = APIRouter()

@router.get("/user", response_model=UserResponse)
async def get_user(uid: str = Query(...), set_head: Optional[int] = Query(None)):
    users = get_users_collection()
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # If set_head is provided, update lastHead first
    if set_head is not None:
        await users.update_one({"uid": uid}, {"$set": {"lastHead": set_head}})

    user = await users.find_one({"uid": uid})
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return UserResponse(
        uid=user["uid"],
        email=user["email"],
        lastHead=user["lastHead"],
        createdAt=user["createdAt"]
    )
