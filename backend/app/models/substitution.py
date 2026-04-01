import uuid
from datetime import date, datetime, timezone

from sqlalchemy import String, ForeignKey, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Substitution(Base):
    __tablename__ = "substitutions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    schedule_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("schedules.id"))
    original_teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teachers.id"))
    substitute_teacher_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("teachers.id"))
    date: Mapped[date] = mapped_column(Date)
    timeslot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("timeslots.id"))
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subjects.id"))
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rooms.id"))
    reason: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
