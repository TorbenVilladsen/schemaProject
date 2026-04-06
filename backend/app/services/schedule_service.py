"""Orchestrates schedule generation: loads data, runs solver, persists results."""

import uuid

from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.models.tenant import Tenant
from app.models.teacher import Teacher, TeacherQualification, TeacherAvailability
from app.models.subject import Subject
from app.models.room import Room
from app.models.timeslot import Timeslot
from app.models.schedule import Schedule, ScheduleEntry
from app.models.school_class import SchoolClass
from app.solver.model import (
    SolverInput,
    TeacherData,
    SubjectData,
    RoomData,
    TimeslotData,
    ClassData,
    build_model,
    is_blocked_timeslot,
)


def generate_schedule(db: Session, schedule: Schedule, tenant: Tenant) -> dict:
    """Generate a schedule using the constraint solver."""
    schedule.solver_status = "running"
    db.commit()

    # Load all data for this tenant
    teachers = (
        db.query(Teacher)
        .options(selectinload(Teacher.qualifications), selectinload(Teacher.availability))
        .filter(Teacher.tenant_id == tenant.id)
        .all()
    )
    subjects = db.query(Subject).filter(Subject.tenant_id == tenant.id).all()
    rooms = db.query(Room).filter(Room.tenant_id == tenant.id).all()
    timeslots = db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).order_by(Timeslot.slot_index).all()
    school_classes = db.query(SchoolClass).filter(SchoolClass.tenant_id == tenant.id).all()

    missing = []
    if not teachers:
        missing.append("teachers")
    if not subjects:
        missing.append("subjects")
    if not rooms:
        missing.append("rooms")
    if not timeslots:
        missing.append("timeslots")
    if missing:
        error_msg = f"Missing data: no {', '.join(missing)} found. Create them before generating."
        schedule.solver_status = "infeasible"
        schedule.solver_stats = {"error": error_msg}
        db.commit()
        return {"status": "infeasible", "detail": error_msg}

    # Build timeslot index for availability mapping
    timeslot_index = {ts.id: idx for idx, ts in enumerate(timeslots)}

    # Build solver input
    teacher_data = []
    for t in teachers:
        td = TeacherData(
            id=t.id,
            name=t.name,
            max_hours_week=t.max_hours_week,
            max_hours_day=t.max_hours_day,
        )
        # Map subject_name qualifications to actual subject IDs
        for q in t.qualifications:
            for s in subjects:
                if s.name == q.subject_name:
                    td.qualified_subjects[s.id] = (q.min_grade, q.max_grade)
        # Map availability records to (day, period_idx) -> is_available
        for av in t.availability:
            p_idx = timeslot_index.get(av.timeslot_id)
            if p_idx is not None:
                td.availability[(av.day_of_week, p_idx)] = av.is_available
        teacher_data.append(td)

    subject_data = [
        SubjectData(
            id=s.id,
            name=s.name,
            grade_level=s.grade_level,
            hours_per_week=s.hours_per_week,
            requires_room_type=s.requires_room_type,
            class_id=s.class_id,
        )
        for s in subjects
    ]

    class_data = [
        ClassData(
            id=c.id,
            name=c.name,
            grade_level=c.grade_level,
            contact_teacher_id=c.contact_teacher_id,
        )
        for c in school_classes
    ]

    room_data = [
        RoomData(id=r.id, name=r.name, capacity=r.capacity, room_type=r.room_type)
        for r in rooms
    ]

    timeslot_data = [
        TimeslotData(id=ts.id, slot_index=ts.slot_index, label=ts.label, period_type=ts.period_type)
        for ts in timeslots
    ]

    solver_input = SolverInput(
        teachers=teacher_data,
        subjects=subject_data,
        rooms=room_data,
        timeslots=timeslot_data,
        classes=class_data,
    )

    # Pre-flight diagnostics: find problems before running the solver
    diagnostics = []
    for s in subjects:
        qualified = [
            td for td in teacher_data
            if s.id in td.qualified_subjects
            and td.qualified_subjects[s.id][0] <= s.grade_level <= td.qualified_subjects[s.id][1]
        ]
        if not qualified:
            diagnostics.append(f"No qualified teacher for '{s.name}' (grade {s.grade_level})")

        if s.requires_room_type:
            matching_rooms = [r for r in rooms if r.room_type.lower() == s.requires_room_type.lower()]
            if not matching_rooms:
                diagnostics.append(
                    f"Subject '{s.name}' requires room type '{s.requires_room_type}' but no such room exists"
                )

    total_hours = sum(s.hours_per_week for s in subjects)
    schedulable_slots_per_day = sum(
        1 for ts in timeslots if not is_blocked_timeslot(ts.label, ts.period_type)
    )
    total_slots = schedulable_slots_per_day * 5  # 5 days
    if schedulable_slots_per_day == 0 and total_hours > 0:
        diagnostics.append(
            "No schedulable periods configured. Læsebånd periods are blocked from automatic scheduling."
        )
    if total_hours > total_slots:
        diagnostics.append(
            f"Total hours needed ({total_hours}) exceeds available slots ({total_slots} = {schedulable_slots_per_day} schedulable periods × 5 days)"
        )

    # Run solver
    result = build_model(solver_input, time_limit_seconds=settings.solver_time_limit_seconds)

    # Clear existing entries for this schedule
    db.query(ScheduleEntry).filter(ScheduleEntry.schedule_id == schedule.id).delete()

    if result.status in ("optimal", "feasible"):
        for entry in result.entries:
            db.add(ScheduleEntry(
                schedule_id=schedule.id,
                teacher_id=entry["teacher_id"],
                subject_id=entry["subject_id"],
                room_id=entry["room_id"],
                day_of_week=entry["day_of_week"],
                timeslot_id=entry["timeslot_id"],
                class_id=entry.get("class_id"),
            ))

    schedule.solver_status = result.status
    schedule.solver_stats = result.stats
    db.commit()

    if result.status == "infeasible":
        detail = "No feasible schedule found."
        if diagnostics:
            detail += " Issues found: " + "; ".join(diagnostics)
        else:
            detail += " The combination of constraints (teacher hours, availability, room types) cannot be satisfied."
        return {"status": result.status, "stats": result.stats, "detail": detail}

    return {"status": result.status, "stats": result.stats}
