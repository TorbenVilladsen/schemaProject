import uuid

from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    max_hours_week: Mapped[int] = mapped_column(Integer, default=25)
    max_hours_day: Mapped[int] = mapped_column(Integer, default=6)

    qualifications: Mapped[list["TeacherQualification"]] = relationship(
        back_populates="teacher", cascade="all, delete-orphan"
    )
    availability: Mapped[list["TeacherAvailability"]] = relationship(
        back_populates="teacher", cascade="all, delete-orphan"
    )


class TeacherQualification(Base):
    __tablename__ = "teacher_qualifications"
    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_name", name="uq_teacher_subject"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    subject_name: Mapped[str] = mapped_column(String(100))
    min_grade: Mapped[int] = mapped_column(Integer, default=0)
    max_grade: Mapped[int] = mapped_column(Integer, default=9)

    teacher: Mapped["Teacher"] = relationship(back_populates="qualifications")


class TeacherAvailability(Base):
    __tablename__ = "teacher_availability"
    __table_args__ = (
        UniqueConstraint("teacher_id", "timeslot_id", "day_of_week", name="uq_teacher_slot_day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teachers.id", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0=Monday .. 4=Friday
    timeslot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("timeslots.id"))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    preference: Mapped[int] = mapped_column(Integer, default=0)  # -2 to +2

    teacher: Mapped["Teacher"] = relationship(back_populates="availability")
