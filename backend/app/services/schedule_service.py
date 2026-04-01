"""Orchestrates schedule generation: loads data, runs solver, persists results."""

import uuid

from sqlalchemy.orm import Session

from app.config import settings
from app.models.tenant import Tenant
from app.models.teacher import Teacher, TeacherQualification
from app.models.subject import Subject
from app.models.room import Room
from app.models.timeslot import Timeslot
from app.models.schedule import Schedule, ScheduleEntry
from app.solver.model import (
    SolverInput,
    TeacherData,
    SubjectData,
    RoomData,
    TimeslotData,
    build_model,
)


def generate_schedule(db: Session, schedule: Schedule, tenant: Tenant) -> dict:
    """Generate a schedule using the constraint solver."""
    schedule.solver_status = "running"
    db.commit()

    # Load all data for this tenant
    teachers = db.query(Teacher).filter(Teacher.tenant_id == tenant.id).all()
    subjects = db.query(Subject).filter(Subject.tenant_id == tenant.id).all()
    rooms = db.query(Room).filter(Room.tenant_id == tenant.id).all()
    timeslots = db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).order_by(Timeslot.slot_index).all()

    if not teachers or not subjects or not rooms or not timeslots:
        schedule.solver_status = "infeasible"
        schedule.solver_stats = {"error": "Missing data: need teachers, subjects, rooms, and timeslots"}
        db.commit()
        return {"status": "infeasible"}

    # Build solver input
    teacher_data = []
    for t in teachers:
        qualifications = db.query(TeacherQualification).filter(TeacherQualification.teacher_id == t.id).all()
        td = TeacherData(
            id=t.id,
            name=t.name,
            max_hours_week=t.max_hours_week,
            max_hours_day=t.max_hours_day,
        )
        # Map subject_name qualifications to actual subject IDs
        for q in qualifications:
            for s in subjects:
                if s.name == q.subject_name:
                    td.qualified_subjects[s.id] = (q.min_grade, q.max_grade)
        teacher_data.append(td)

    subject_data = [
        SubjectData(
            id=s.id,
            name=s.name,
            grade_level=s.grade_level,
            hours_per_week=s.hours_per_week,
            requires_room_type=s.requires_room_type,
        )
        for s in subjects
    ]

    room_data = [
        RoomData(id=r.id, name=r.name, capacity=r.capacity, room_type=r.room_type)
        for r in rooms
    ]

    timeslot_data = [
        TimeslotData(id=ts.id, slot_index=ts.slot_index)
        for ts in timeslots
    ]

    solver_input = SolverInput(
        teachers=teacher_data,
        subjects=subject_data,
        rooms=room_data,
        timeslots=timeslot_data,
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
            ))

    schedule.solver_status = result.status
    schedule.solver_stats = result.stats
    db.commit()

    return {"status": result.status, "stats": result.stats}
