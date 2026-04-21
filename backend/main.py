from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to the database
    from database import connect_db, disconnect_db
    await connect_db()
    yield
    # Shutdown: disconnect from the database
    await disconnect_db()


app = FastAPI(title="File System Disk Scheduler API", lifespan=lifespan)

# Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.auth_router import router as auth_router

app.include_router(auth_router)

from routers.user_router import router as user_router
app.include_router(user_router)

from routers.file_router import router as file_router
app.include_router(file_router)


@app.get("/")
async def root():
    return {"message": "File System Disk Scheduler API"}


@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",   # replace 'main' with your filename (without .py)
        host="0.0.0.0",
        port=8000,
        reload=True   # remove in production
    )