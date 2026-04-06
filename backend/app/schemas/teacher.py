import uuid

from pydantic import BaseModel, Field


class QualificationBase(BaseModel):
    subject_name: str = Field(min_length=1, max_length=100)
    min_grade: int = Field(default=0, ge=0, le=13)
    max_grade: int = Field(default=9, ge=0, le=13)


class QualificationCreate(QualificationBase):
    pass


class QualificationRead(QualificationBase):
    id: uuid.UUID


class AvailabilityBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    timeslot_id: uuid.UUID
    is_available: bool = True
    preference: int = Field(default=0, ge=-2, le=2)


class AvailabilityCreate(AvailabilityBase):
    pass


class AvailabilityRead(AvailabilityBase):
    id: uuid.UUID


class TeacherBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    max_hours_week: int = Field(default=25, ge=1, le=60)
    max_hours_day: int = Field(default=6, ge=1, le=12)


class TeacherCreate(TeacherBase):
    qualifications: list[QualificationCreate] = Field(default_factory=list)
    availability: list[AvailabilityCreate] = Field(default_factory=list)


class TeacherUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    max_hours_week: int | None = Field(default=None, ge=1, le=60)
    max_hours_day: int | None = Field(default=None, ge=1, le=12)
    availability: list[AvailabilityCreate] | None = None


class TeacherRead(TeacherBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    qualifications: list[QualificationRead] = Field(default_factory=list)
    availability: list[AvailabilityRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}
