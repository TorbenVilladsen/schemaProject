import uuid
from datetime import time

from sqlalchemy import String, Integer, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Timeslot(Base):
    __tablename__ = "timeslots"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slot_index", name="uq_tenant_slot_index"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    slot_index: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    label: Mapped[str | None] = mapped_column(String(50))
    period_type: Mapped[str] = mapped_column(String(20), default="module")  # "reading" or "module"
