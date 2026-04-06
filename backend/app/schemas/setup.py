import uuid
from datetime import time

from pydantic import BaseModel, Field, field_serializer

from app.schemas.teacher import QualificationCreate


class SetupTeacher(BaseModel):
    id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=255)
    max_hours_week: int = Field(default=25, ge=1, le=60)
    max_hours_day: int = Field(default=6, ge=1, le=12)
    qualifications: list[QualificationCreate] = Field(default_factory=list)


class SetupClass(BaseModel):
    id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=50)
    grade_level: int = Field(ge=0, le=13)
    contact_teacher_id: uuid.UUID | None = None
    primary_room_id: uuid.UUID | None = None


class SetupSubject(BaseModel):
    id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=100)
    grade_level: int = Field(ge=0, le=13)
    hours_per_week: int = Field(ge=1, le=40)
    requires_room_type: str | None = Field(default=None, max_length=50)
    class_id: uuid.UUID | None = None


class SetupRoom(BaseModel):
    id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=100)
    capacity: int = Field(ge=1, le=1000)
    room_type: str = Field(default="classroom", min_length=1, max_length=50)


class SetupTimeslot(BaseModel):
    id: uuid.UUID | None = None
    slot_index: int = Field(ge=0, le=20)
    start_time: time
    end_time: time
    label: str | None = Field(default=None, max_length=50)
    period_type: str = Field(default="module", max_length=20)

    @field_serializer("start_time", "end_time")
    def serialize_time(self, value: time) -> str:
        return value.strftime("%H:%M")


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
