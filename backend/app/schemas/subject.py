import uuid

from pydantic import BaseModel, Field


class SubjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    grade_level: int = Field(ge=0, le=13)
    hours_per_week: int = Field(ge=1, le=40)
    requires_room_type: str | None = Field(default=None, max_length=50)
    class_id: uuid.UUID | None = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    grade_level: int | None = Field(default=None, ge=0, le=13)
    hours_per_week: int | None = Field(default=None, ge=1, le=40)
    requires_room_type: str | None = Field(default=None, max_length=50)
    class_id: uuid.UUID | None = None


class SubjectRead(SubjectBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    model_config = {"from_attributes": True}
