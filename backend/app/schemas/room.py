import uuid

from pydantic import BaseModel, Field


class RoomAvailabilityBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    timeslot_id: uuid.UUID
    is_available: bool = True


class RoomAvailabilityCreate(RoomAvailabilityBase):
    pass


class RoomAvailabilityRead(RoomAvailabilityBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}


class RoomBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    capacity: int = Field(ge=1, le=1000)
    room_type: str = Field(default="classroom", min_length=1, max_length=50)


class RoomCreate(RoomBase):
    availability: list[RoomAvailabilityCreate] = Field(default_factory=list)


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    capacity: int | None = Field(default=None, ge=1, le=1000)
    room_type: str | None = Field(default=None, min_length=1, max_length=50)
    grid_row: int | None = None
    grid_col: int | None = None
    grid_pane: str | None = None
    availability: list[RoomAvailabilityCreate] | None = None


class RoomRead(RoomBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    grid_row: int | None = None
    grid_col: int | None = None
    grid_pane: str | None = None
    availability: list[RoomAvailabilityRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}
