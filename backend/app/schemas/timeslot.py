import uuid
from datetime import time

from pydantic import BaseModel, Field, field_serializer


class TimeslotBase(BaseModel):
    slot_index: int = Field(ge=0, le=20)
    start_time: time
    end_time: time
    label: str | None = Field(default=None, max_length=50)
    period_type: str = Field(default="module", max_length=20)


class TimeslotCreate(TimeslotBase):
    pass


class TimeslotRead(TimeslotBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    @field_serializer("start_time", "end_time")
    def serialize_time(self, value: time) -> str:
        return value.strftime("%H:%M")

    model_config = {"from_attributes": True}
