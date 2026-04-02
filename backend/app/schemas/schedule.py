import uuid
from datetime import datetime

from pydantic import BaseModel


class ScheduleCreate(BaseModel):
    name: str | None = None


class ScheduleEntryRead(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    subject_id: uuid.UUID
    room_id: uuid.UUID
    day_of_week: int
    timeslot_id: uuid.UUID
    class_id: uuid.UUID | None = None
    is_locked: bool = False

    model_config = {"from_attributes": True}


class ScheduleRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str | None
    status: str
    solver_status: str | None
    solver_stats: dict | None
    created_at: datetime
    published_at: datetime | None
    entries: list[ScheduleEntryRead] = []

    model_config = {"from_attributes": True}


class ScheduleListRead(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str | None
    status: str
    solver_status: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
