import uuid
from datetime import time

from pydantic import BaseModel, Field

from app.schemas.teacher import QualificationCreate


class SetupTeacher(BaseModel):
    id: uuid.UUID | None = None
    name: str
    email: str | None = None
    max_hours_week: int = 25
    max_hours_day: int = 6
    qualifications: list[QualificationCreate] = Field(default_factory=list)


class SetupClass(BaseModel):
    id: uuid.UUID | None = None
    name: str
    grade_level: int
    contact_teacher_id: uuid.UUID | None = None


class SetupSubject(BaseModel):
    id: uuid.UUID | None = None
    name: str
    grade_level: int
    hours_per_week: int
    requires_room_type: str | None = None
    class_id: uuid.UUID | None = None


class SetupRoom(BaseModel):
    id: uuid.UUID | None = None
    name: str
    capacity: int
    room_type: str = "classroom"


class SetupTimeslot(BaseModel):
    id: uuid.UUID | None = None
    slot_index: int
    start_time: time
    end_time: time
    label: str | None = None
    period_type: str = "module"


class SetupData(BaseModel):
    version: int = 1
    classes: list[SetupClass] = Field(default_factory=list)
    teachers: list[SetupTeacher] = Field(default_factory=list)
    subjects: list[SetupSubject] = Field(default_factory=list)
    rooms: list[SetupRoom] = Field(default_factory=list)
    timeslots: list[SetupTimeslot] = Field(default_factory=list)


class SetupImportRequest(BaseModel):
    replace_existing: bool = True
    data: SetupData


class SetupImportResponse(BaseModel):
    imported: dict[str, int]
    replace_existing: bool
