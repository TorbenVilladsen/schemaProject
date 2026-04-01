import uuid

from pydantic import BaseModel


class QualificationBase(BaseModel):
    subject_name: str
    min_grade: int = 0
    max_grade: int = 9


class QualificationCreate(QualificationBase):
    pass


class QualificationRead(QualificationBase):
    id: uuid.UUID


class TeacherBase(BaseModel):
    name: str
    email: str | None = None
    max_hours_week: int = 25
    max_hours_day: int = 6


class TeacherCreate(TeacherBase):
    qualifications: list[QualificationCreate] = []


class TeacherUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    max_hours_week: int | None = None
    max_hours_day: int | None = None


class TeacherRead(TeacherBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    qualifications: list[QualificationRead] = []

    model_config = {"from_attributes": True}
