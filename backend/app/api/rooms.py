import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.room import Room, RoomAvailability
from app.schemas.room import RoomCreate, RoomRead, RoomUpdate

router = APIRouter()


@router.get("/rooms", response_model=list[RoomRead])
def list_rooms(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return (
        db.query(Room)
        .options(selectinload(Room.availability))
        .filter(Room.tenant_id == tenant.id)
        .all()
    )


@router.post("/rooms", response_model=RoomRead, status_code=201)
def create_room(
    data: RoomCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    room = Room(
        tenant_id=tenant.id,
        name=data.name,
        capacity=data.capacity,
        room_type=data.room_type,
    )
    for a in data.availability:
        room.availability.append(
            RoomAvailability(
                day_of_week=a.day_of_week,
                timeslot_id=a.timeslot_id,
                is_available=a.is_available,
            )
        )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.get("/rooms/{room_id}", response_model=RoomRead)
def get_room(
    room_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    room = (
        db.query(Room)
        .options(selectinload(Room.availability))
        .filter(Room.id == room_id, Room.tenant_id == tenant.id)
        .first()
    )
    if not room:
        raise HTTPException(404, "Room not found")
    return room


@router.put("/rooms/{room_id}", response_model=RoomRead)
def update_room(
    room_id: uuid.UUID,
    data: RoomUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    room = (
        db.query(Room)
        .options(selectinload(Room.availability))
        .filter(Room.id == room_id, Room.tenant_id == tenant.id)
        .first()
    )
    if not room:
        raise HTTPException(404, "Room not found")
    payload = data.model_dump(exclude_unset=True)
    availability = payload.pop("availability", None)
    for field, value in payload.items():
        setattr(room, field, value)
    if availability is not None:
        db.query(RoomAvailability).filter(RoomAvailability.room_id == room.id).delete(
            synchronize_session=False
        )
        db.flush()
        for a in availability:
            db.add(
                RoomAvailability(
                    room_id=room.id,
                    day_of_week=a["day_of_week"],
                    timeslot_id=a["timeslot_id"],
                    is_available=a.get("is_available", True),
                )
            )
    db.commit()
    db.refresh(room)
    return room


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(
    room_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    room = db.query(Room).filter(Room.id == room_id, Room.tenant_id == tenant.id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    db.delete(room)
    db.commit()
