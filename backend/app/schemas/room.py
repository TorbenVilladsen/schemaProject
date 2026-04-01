import uuid

from pydantic import BaseModel


class RoomBase(BaseModel):
    name: str
    capacity: int
    room_type: str = "classroom"


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = None
    room_type: str | None = None


class RoomRead(RoomBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    model_config = {"from_attributes": True}
