from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AuthRequest(BaseModel):
    action: Literal["register", "login"]
    email: str
    password: str


class AuthResponse(BaseModel):
    uid: str
    lastHead: int = 0


class FileCreateRequest(BaseModel):
    uid: str
    filename: str
    path: str
    size: int
    start: int
    end: int


class FileRecord(BaseModel):
    id: str
    filename: str
    path: str
    size: int
    start: int
    end: int
    createdAt: datetime
    uid: str


class UserResponse(BaseModel):
    uid: str
    email: str
    lastHead: int
    createdAt: datetime


class DeleteFileResponse(BaseModel):
    success: bool
    deletedFile: FileRecord


class ErrorResponse(BaseModel):
    error: str
