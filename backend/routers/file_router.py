import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import DuplicateKeyError

from database import get_files_collection, get_users_collection
from models import DeleteFileResponse, FileCreateRequest, FileRecord

QUOTA = 104_857_6  # 100 MB in bytes

router = APIRouter()


@router.post("/file", response_model=FileRecord)
async def create_file(request: FileCreateRequest):
    users = get_users_collection()
    files = get_files_collection()

    # Validate uid
    user = await users.find_one({"uid": request.uid})
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Check quota: sum of existing file sizes + new file size
    pipeline = [
        {"$match": {"uid": request.uid}},
        {"$group": {"_id": None, "total": {"$sum": "$size"}}}
    ]
    result = await files.aggregate(pipeline).to_list(1)
    current_total = result[0]["total"] if result else 0

    if current_total + request.size > QUOTA:
        raise HTTPException(status_code=400, detail="Storage quota exceeded")

    # Create file document
    file_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    file_doc = {
        "id": file_id,
        "filename": request.filename,
        "path": request.path,
        "size": request.size,
        "start": request.start,
        "end": request.end,
        "createdAt": created_at,
        "uid": request.uid,
    }

    try:
        await files.insert_one(file_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="File with this name already exists")

    # Update user's lastHead to the start byte of the new file
    await users.update_one({"uid": request.uid}, {"$set": {"lastHead": request.start}})

    return FileRecord(
        id=file_id,
        filename=request.filename,
        path=request.path,
        size=request.size,
        start=request.start,
        end=request.end,
        createdAt=created_at,
        uid=request.uid,
    )


@router.get("/files", response_model=List[FileRecord])
async def get_files(uid: str = Query(...)):
    users = get_users_collection()
    files = get_files_collection()

    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = await users.find_one({"uid": uid})
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    cursor = files.find({"uid": uid})
    file_list = await cursor.to_list(length=None)

    return [
        FileRecord(
            id=f["id"],
            filename=f["filename"],
            path=f["path"],
            size=f["size"],
            start=f["start"],
            end=f["end"],
            createdAt=f["createdAt"],
            uid=f["uid"],
        )
        for f in file_list
    ]


@router.delete("/file", response_model=DeleteFileResponse)
async def delete_file(uid: str = Query(...), filename: str = Query(...)):
    users = get_users_collection()
    files = get_files_collection()

    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = await users.find_one({"uid": uid})
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    file_doc = await files.find_one({"uid": uid, "filename": filename})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    await files.delete_one({"uid": uid, "filename": filename})

    # Update user's lastHead to the start byte of the deleted file
    await users.update_one({"uid": uid}, {"$set": {"lastHead": file_doc["start"]}})

    deleted_file = FileRecord(
        id=file_doc["id"],
        filename=file_doc["filename"],
        path=file_doc["path"],
        size=file_doc["size"],
        start=file_doc["start"],
        end=file_doc["end"],
        createdAt=file_doc["createdAt"],
        uid=file_doc["uid"],
    )

    return DeleteFileResponse(success=True, deletedFile=deleted_file)
