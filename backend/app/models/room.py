import uuid

from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    capacity: Mapped[int] = mapped_column(Integer)
    room_type: Mapped[str] = mapped_column(String(50), default="classroom")
    grid_row: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grid_col: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grid_pane: Mapped[str | None] = mapped_column(String(100), nullable=True)

    availability: Mapped[list["RoomAvailability"]] = relationship(
        back_populates="room", cascade="all, delete-orphan"
    )


class RoomAvailability(Base):
    __tablename__ = "room_availability"
    __table_args__ = (
        UniqueConstraint("room_id", "timeslot_id", "day_of_week", name="uq_room_slot_day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0=Monday .. 4=Friday
    timeslot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("timeslots.id"))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    room: Mapped["Room"] = relationship(back_populates="availability")
