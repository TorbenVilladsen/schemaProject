import uuid

from pydantic import BaseModel


class SchoolClassBase(BaseModel):
    name: str
    grade_level: int
    contact_teacher_id: uuid.UUID | None = None


class SchoolClassCreate(SchoolClassBase):
    pass


class SchoolClassUpdate(BaseModel):
    name: str | None = None
    grade_level: int | None = None
    contact_teacher_id: uuid.UUID | None = None


class SchoolClassRead(SchoolClassBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    model_config = {"from_attributes": True}
