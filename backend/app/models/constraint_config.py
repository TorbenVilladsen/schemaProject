import uuid

from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConstraintConfig(Base):
    __tablename__ = "constraint_config"
    __table_args__ = (
        UniqueConstraint("tenant_id", "constraint_key", name="uq_tenant_constraint"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), index=True)
    constraint_key: Mapped[str] = mapped_column(String(100))
    weight: Mapped[int] = mapped_column(Integer, default=1)
    parameters: Mapped[dict | None] = mapped_column(JSON)
