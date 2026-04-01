import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.room import Room
from app.schemas.room import RoomCreate, RoomRead, RoomUpdate

router = APIRouter()


@router.get("/rooms", response_model=list[RoomRead])
def list_rooms(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return db.query(Room).filter(Room.tenant_id == tenant.id).all()


@router.post("/rooms", response_model=RoomRead, status_code=201)
def create_room(
    data: RoomCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    room = Room(tenant_id=tenant.id, **data.model_dump())
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
    room = db.query(Room).filter(Room.id == room_id, Room.tenant_id == tenant.id).first()
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
    room = db.query(Room).filter(Room.id == room_id, Room.tenant_id == tenant.id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
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
