import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.schedule import Schedule
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleListRead
from app.services.schedule_service import generate_schedule

router = APIRouter()


@router.get("/schedules", response_model=list[ScheduleListRead])
def list_schedules(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return db.query(Schedule).filter(Schedule.tenant_id == tenant.id).order_by(Schedule.created_at.desc()).all()


@router.post("/schedules", response_model=ScheduleListRead, status_code=201)
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    schedule = Schedule(tenant_id=tenant.id, name=data.name, status="draft")
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/schedules/{schedule_id}", response_model=ScheduleRead)
def get_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    schedule = (
        db.query(Schedule)
        .options(joinedload(Schedule.entries))
        .filter(Schedule.id == schedule_id, Schedule.tenant_id == tenant.id)
        .first()
    )
    if not schedule:
        raise HTTPException(404, "Schedule not found")
    return schedule


@router.post("/schedules/{schedule_id}/generate", response_model=ScheduleRead)
def trigger_generate(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.tenant_id == tenant.id).first()
    if not schedule:
        raise HTTPException(404, "Schedule not found")
    result = generate_schedule(db, schedule, tenant)
    if result["status"] == "infeasible":
        raise HTTPException(400, result.get("detail", "No feasible schedule found. Check constraints and data."))
    db.refresh(schedule)
    return (
        db.query(Schedule)
        .options(joinedload(Schedule.entries))
        .filter(Schedule.id == schedule_id)
        .first()
    )


@router.delete("/schedules/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.tenant_id == tenant.id).first()
    if not schedule:
        raise HTTPException(404, "Schedule not found")
    db.delete(schedule)
    db.commit()
