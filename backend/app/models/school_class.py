import uuid

from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SchoolClass(Base):
    __tablename__ = "school_classes"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_tenant_class_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(50))  # e.g. "3A", "7B"
    grade_level: Mapped[int] = mapped_column(Integer)  # 0-9
    contact_teacher_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("teachers.id"))
