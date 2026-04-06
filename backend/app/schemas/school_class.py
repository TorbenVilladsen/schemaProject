import uuid

from pydantic import BaseModel, Field


class SchoolClassBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    grade_level: int = Field(ge=0, le=13)
    contact_teacher_id: uuid.UUID | None = None
    primary_room_id: uuid.UUID | None = None


class SchoolClassCreate(SchoolClassBase):
    pass


class SchoolClassUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    grade_level: int | None = Field(default=None, ge=0, le=13)
    contact_teacher_id: uuid.UUID | None = None
    primary_room_id: uuid.UUID | None = None


class SchoolClassRead(SchoolClassBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    model_config = {"from_attributes": True}
