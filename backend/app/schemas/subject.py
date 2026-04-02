import uuid

from pydantic import BaseModel


class SubjectBase(BaseModel):
    name: str
    grade_level: int
    hours_per_week: int
    requires_room_type: str | None = None
    class_id: uuid.UUID | None = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = None
    grade_level: int | None = None
    hours_per_week: int | None = None
    requires_room_type: str | None = None
    class_id: uuid.UUID | None = None


class SubjectRead(SubjectBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    model_config = {"from_attributes": True}
