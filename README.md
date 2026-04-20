# File System Disk Scheduler

A web-based simulation of a file system with disk scheduling algorithms. Users authenticate, manage simulated file metadata within a 100 MB storage quota, and visualize how classic disk scheduling algorithms (FCFS, SSTF, SCAN) traverse the storage space.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** FastAPI (Python)
- **Database:** MongoDB (via Motor async driver)

## Project Structure

```
.
├── frontend/        # React + Vite + TypeScript SPA
├── backend/         # FastAPI application
└── README.md
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # edit MONGO_URI and DB_NAME as needed
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend
pytest backend/

# Frontend
cd frontend && npm test
```
