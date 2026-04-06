import threading
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.api.deps import get_tenant
from app.models.room import Room, RoomAvailability
from app.models.tenant import Tenant
from app.models.schedule import Schedule, ScheduleEntry
from app.models.subject import Subject
from app.models.school_class import SchoolClass
from app.models.teacher import Teacher, TeacherAvailability
from app.models.timeslot import Timeslot
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleListRead, ScheduleEntryRead, ScheduleEntryMove
from app.services.schedule_service import generate_schedule
from app.solver.model import is_blocked_timeslot

router = APIRouter()

_solver_lock = threading.Lock()


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
    if not _solver_lock.acquire(blocking=False):
        raise HTTPException(409, "A schedule generation is already in progress. Please wait and try again.")
    try:
        result = generate_schedule(db, schedule, tenant)
    finally:
        _solver_lock.release()
    if result["status"] == "infeasible":
        raise HTTPException(400, result.get("detail", "No feasible schedule found. Check constraints and data."))
    return (
        db.query(Schedule)
        .options(joinedload(Schedule.entries))
        .filter(Schedule.id == schedule_id)
        .first()
    )


@router.patch("/schedules/{schedule_id}/entries/{entry_id}", response_model=ScheduleEntryRead)
def move_schedule_entry(
    schedule_id: uuid.UUID,
    entry_id: uuid.UUID,
    data: ScheduleEntryMove,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id, Schedule.tenant_id == tenant.id).first()
    if not schedule:
        raise HTTPException(404, "Schedule not found")

    entry = db.query(ScheduleEntry).filter(
        ScheduleEntry.id == entry_id,
        ScheduleEntry.schedule_id == schedule_id,
    ).first()
    if not entry:
        raise HTTPException(404, "Schedule entry not found")
    if entry.day_of_week == data.day_of_week and entry.timeslot_id == data.timeslot_id:
        return entry

    if data.day_of_week < 0 or data.day_of_week > 4:
        raise HTTPException(400, "day_of_week must be 0-4")

    target_timeslot = db.query(Timeslot).filter(
        Timeslot.id == data.timeslot_id,
        Timeslot.tenant_id == tenant.id,
    ).first()
    if not target_timeslot:
        raise HTTPException(400, "Invalid timeslot for this tenant")
    if is_blocked_timeslot(target_timeslot.label, target_timeslot.period_type):
        raise HTTPException(409, "Cannot place entries in blocked periods (e.g. Læsebånd)")

    # Check for teacher conflict in the target slot
    teacher_conflict = db.query(ScheduleEntry).filter(
        ScheduleEntry.schedule_id == schedule_id,
        ScheduleEntry.teacher_id == entry.teacher_id,
        ScheduleEntry.day_of_week == data.day_of_week,
        ScheduleEntry.timeslot_id == data.timeslot_id,
        ScheduleEntry.id != entry_id,
    ).first()

    if teacher_conflict:
        subject = db.query(Subject).filter(Subject.id == teacher_conflict.subject_id).first()
        subject_name = subject.name if subject else "another subject"
        raise HTTPException(409, f"Teacher slot occupied by {subject_name}")

    teacher_unavailable = db.query(TeacherAvailability).filter(
        TeacherAvailability.teacher_id == entry.teacher_id,
        TeacherAvailability.day_of_week == data.day_of_week,
        TeacherAvailability.timeslot_id == data.timeslot_id,
        TeacherAvailability.is_available.is_(False),
    ).first()
    if teacher_unavailable:
        raise HTTPException(409, "Teacher unavailable in selected slot")

    teacher = db.query(Teacher).filter(
        Teacher.id == entry.teacher_id,
        Teacher.tenant_id == tenant.id,
    ).first()
    if not teacher:
        raise HTTPException(400, "Teacher not found for schedule entry")

    teacher_day_load = db.query(ScheduleEntry).filter(
        ScheduleEntry.schedule_id == schedule_id,
        ScheduleEntry.teacher_id == entry.teacher_id,
        ScheduleEntry.day_of_week == data.day_of_week,
        ScheduleEntry.id != entry_id,
    ).count()
    if teacher_day_load + 1 > teacher.max_hours_day:
        raise HTTPException(409, f"Teacher exceeds max hours per day ({teacher.max_hours_day})")

    subject = db.query(Subject).filter(
        Subject.id == entry.subject_id,
        Subject.tenant_id == tenant.id,
    ).first()
    if not subject:
        raise HTTPException(400, "Subject not found for schedule entry")

    if entry.room_id is not None:
        room = db.query(Room).filter(
            Room.id == entry.room_id,
            Room.tenant_id == tenant.id,
        ).first()
        if not room:
            raise HTTPException(409, "Entry room is missing or outside this tenant")

        room_conflict = db.query(ScheduleEntry).filter(
            ScheduleEntry.schedule_id == schedule_id,
            ScheduleEntry.room_id == entry.room_id,
            ScheduleEntry.day_of_week == data.day_of_week,
            ScheduleEntry.timeslot_id == data.timeslot_id,
            ScheduleEntry.id != entry_id,
        ).first()
        if room_conflict:
            conflict_subject = db.query(Subject).filter(Subject.id == room_conflict.subject_id).first()
            conflict_name = conflict_subject.name if conflict_subject else "another subject"
            raise HTTPException(409, f"Room slot occupied by {conflict_name}")

        room_unavailable = db.query(RoomAvailability).filter(
            RoomAvailability.room_id == entry.room_id,
            RoomAvailability.day_of_week == data.day_of_week,
            RoomAvailability.timeslot_id == data.timeslot_id,
            RoomAvailability.is_available.is_(False),
        ).first()
        if room_unavailable:
            raise HTTPException(409, "Room unavailable in selected slot")

        if (
            subject.requires_room_type is not None
            and room.room_type.lower() != subject.requires_room_type.lower()
        ):
            raise HTTPException(
                409,
                f"Room type mismatch: '{subject.name}' requires '{subject.requires_room_type}'",
            )

    # Check for class conflict in the target slot
    # Resolve the class for this entry: direct class_id, or inferred from subject grade_level
    entry_class_id = entry.class_id
    if not entry_class_id:
        matching_class = db.query(SchoolClass).filter(
            SchoolClass.tenant_id == tenant.id,
            SchoolClass.grade_level == subject.grade_level,
        ).first()
        if matching_class:
            entry_class_id = matching_class.id

    if entry_class_id:
        # Find all entries for this class in the target slot
        # A class conflict means another entry whose class matches is in the same slot
        slot_entries = db.query(ScheduleEntry).filter(
            ScheduleEntry.schedule_id == schedule_id,
            ScheduleEntry.day_of_week == data.day_of_week,
            ScheduleEntry.timeslot_id == data.timeslot_id,
            ScheduleEntry.id != entry_id,
        ).all()

        for se in slot_entries:
            se_class_id = se.class_id
            if not se_class_id:
                se_subject = db.query(Subject).filter(Subject.id == se.subject_id).first()
                if se_subject:
                    se_match = db.query(SchoolClass).filter(
                        SchoolClass.tenant_id == tenant.id,
                        SchoolClass.grade_level == se_subject.grade_level,
                    ).first()
                    if se_match:
                        se_class_id = se_match.id
            if se_class_id == entry_class_id:
                conflict_subject = db.query(Subject).filter(Subject.id == se.subject_id).first()
                conflict_name = conflict_subject.name if conflict_subject else "another subject"
                raise HTTPException(409, f"Class slot occupied by {conflict_name}")

    try:
        entry.day_of_week = data.day_of_week
        entry.timeslot_id = data.timeslot_id
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Target slot violates scheduling constraints")
    db.refresh(entry)
    return entry


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
