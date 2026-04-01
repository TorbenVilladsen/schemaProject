import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.timeslot import Timeslot
from app.schemas.timeslot import TimeslotCreate, TimeslotRead

router = APIRouter()


@router.get("/timeslots", response_model=list[TimeslotRead])
def list_timeslots(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).order_by(Timeslot.slot_index).all()


@router.post("/timeslots", response_model=TimeslotRead, status_code=201)
def create_timeslot(
    data: TimeslotCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    timeslot = Timeslot(tenant_id=tenant.id, **data.model_dump())
    db.add(timeslot)
    db.commit()
    db.refresh(timeslot)
    return timeslot


@router.delete("/timeslots/{timeslot_id}", status_code=204)
def delete_timeslot(
    timeslot_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    timeslot = db.query(Timeslot).filter(Timeslot.id == timeslot_id, Timeslot.tenant_id == tenant.id).first()
    if not timeslot:
        raise HTTPException(404, "Timeslot not found")
    db.delete(timeslot)
    db.commit()
