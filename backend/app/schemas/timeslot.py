import uuid
from datetime import time

from pydantic import BaseModel


class TimeslotBase(BaseModel):
    slot_index: int
    start_time: time
    end_time: time
    label: str | None = None


class TimeslotCreate(TimeslotBase):
    pass


class TimeslotRead(TimeslotBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    model_config = {"from_attributes": True}
