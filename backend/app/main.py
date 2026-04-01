from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import teachers, subjects, rooms, timeslots, schedules

app = FastAPI(title="Teacher Scheduler", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teachers.router, prefix="/api/v1", tags=["teachers"])
app.include_router(subjects.router, prefix="/api/v1", tags=["subjects"])
app.include_router(rooms.router, prefix="/api/v1", tags=["rooms"])
app.include_router(timeslots.router, prefix="/api/v1", tags=["timeslots"])
app.include_router(schedules.router, prefix="/api/v1", tags=["schedules"])


@app.get("/health")
def health():
    return {"status": "ok"}
