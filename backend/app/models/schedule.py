import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    solver_status: Mapped[str | None] = mapped_column(String(20))
    solver_stats: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    entries: Mapped[list["ScheduleEntry"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan"
    )


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"
    __table_args__ = (
        UniqueConstraint("schedule_id", "teacher_id", "day_of_week", "timeslot_id",
                         name="uq_schedule_teacher_slot"),
        UniqueConstraint("schedule_id", "room_id", "day_of_week", "timeslot_id",
                         name="uq_schedule_room_slot"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    schedule_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("schedules.id", ondelete="CASCADE"), index=True)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teachers.id"))
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id"))
    room_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rooms.id"))
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0=Monday .. 4=Friday
    timeslot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("timeslots.id"))
    class_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("school_classes.id"))
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)

    schedule: Mapped["Schedule"] = relationship(back_populates="entries")
