import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_tenant
from app.database import get_db
from app.models.room import Room
from app.models.schedule import Schedule, ScheduleEntry
from app.models.school_class import SchoolClass
from app.models.subject import Subject
from app.models.substitution import Substitution
from app.models.teacher import Teacher, TeacherAvailability, TeacherQualification
from app.models.tenant import Tenant
from app.models.timeslot import Timeslot
from app.schemas.setup import SetupData, SetupImportRequest, SetupImportResponse

router = APIRouter()


@router.get("/setup/export", response_model=SetupData)
def export_setup(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    classes = db.query(SchoolClass).filter(SchoolClass.tenant_id == tenant.id).all()
    teachers = (
        db.query(Teacher)
        .options(joinedload(Teacher.qualifications))
        .filter(Teacher.tenant_id == tenant.id)
        .all()
    )
    subjects = db.query(Subject).filter(Subject.tenant_id == tenant.id).all()
    rooms = db.query(Room).filter(Room.tenant_id == tenant.id).all()
    timeslots = db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).order_by(Timeslot.slot_index).all()

    return SetupData(
        version=1,
        classes=[
            {
                "id": c.id,
                "name": c.name,
                "grade_level": c.grade_level,
                "contact_teacher_id": c.contact_teacher_id,
                "primary_room_id": c.primary_room_id,
            }
            for c in classes
        ],
        teachers=[
            {
                "id": t.id,
                "name": t.name,
                "max_hours_week": t.max_hours_week,
                "max_hours_day": t.max_hours_day,
                "qualifications": [
                    {
                        "subject_name": q.subject_name,
                        "min_grade": q.min_grade,
                        "max_grade": q.max_grade,
                    }
                    for q in t.qualifications
                ],
            }
            for t in teachers
        ],
        subjects=[
            {
                "id": s.id,
                "name": s.name,
                "grade_level": s.grade_level,
                "hours_per_week": s.hours_per_week,
                "requires_room_type": s.requires_room_type,
                "class_id": s.class_id,
            }
            for s in subjects
        ],
        rooms=[
            {
                "id": r.id,
                "name": r.name,
                "capacity": r.capacity,
                "room_type": r.room_type,
            }
            for r in rooms
        ],
        timeslots=[
            {
                "id": ts.id,
                "slot_index": ts.slot_index,
                "start_time": ts.start_time,
                "end_time": ts.end_time,
                "label": ts.label,
                "period_type": ts.period_type,
            }
            for ts in timeslots
        ],
    )


@router.post("/setup/import", response_model=SetupImportResponse)
def import_setup(
    payload: SetupImportRequest,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    data = payload.data

    teacher_ids = {t.id for t in data.teachers if t.id is not None}
    class_ids = {c.id for c in data.classes if c.id is not None}

    for c in data.classes:
        if c.contact_teacher_id and c.contact_teacher_id not in teacher_ids:
            raise HTTPException(400, f"Class '{c.name}' references unknown teacher id: {c.contact_teacher_id}")

    for s in data.subjects:
        if s.class_id and s.class_id not in class_ids:
            raise HTTPException(400, f"Subject '{s.name}' references unknown class id: {s.class_id}")

    try:
        if payload.replace_existing:
            db.query(Substitution).filter(Substitution.tenant_id == tenant.id).delete(synchronize_session=False)
            db.query(ScheduleEntry).filter(
                ScheduleEntry.schedule_id.in_(
                    db.query(Schedule.id).filter(Schedule.tenant_id == tenant.id)
                )
            ).delete(synchronize_session=False)
            db.query(Schedule).filter(Schedule.tenant_id == tenant.id).delete(synchronize_session=False)

            db.query(Subject).filter(Subject.tenant_id == tenant.id).delete(synchronize_session=False)
            db.query(TeacherAvailability).filter(
                TeacherAvailability.teacher_id.in_(
                    db.query(Teacher.id).filter(Teacher.tenant_id == tenant.id)
                )
            ).delete(synchronize_session=False)
            db.query(TeacherQualification).filter(
                TeacherQualification.teacher_id.in_(
                    db.query(Teacher.id).filter(Teacher.tenant_id == tenant.id)
                )
            ).delete(synchronize_session=False)
            db.query(SchoolClass).filter(SchoolClass.tenant_id == tenant.id).delete(synchronize_session=False)
            db.query(Teacher).filter(Teacher.tenant_id == tenant.id).delete(synchronize_session=False)
            db.query(Room).filter(Room.tenant_id == tenant.id).delete(synchronize_session=False)
            db.query(Timeslot).filter(Timeslot.tenant_id == tenant.id).delete(synchronize_session=False)
            db.flush()

        teacher_id_map: dict[uuid.UUID, uuid.UUID] = {}
        class_id_map: dict[uuid.UUID, uuid.UUID] = {}
        room_id_map: dict[uuid.UUID, uuid.UUID] = {}

        for r in data.rooms:
            new_id = r.id or uuid.uuid4()
            db.add(
                Room(
                    id=new_id,
                    tenant_id=tenant.id,
                    name=r.name,
                    capacity=r.capacity,
                    room_type=r.room_type,
                )
            )
            if r.id:
                room_id_map[r.id] = new_id

        for t in data.teachers:
            new_id = t.id or uuid.uuid4()
            teacher = Teacher(
                id=new_id,
                tenant_id=tenant.id,
                name=t.name,
                max_hours_week=t.max_hours_week,
                max_hours_day=t.max_hours_day,
            )
            db.add(teacher)
            for q in t.qualifications:
                db.add(
                    TeacherQualification(
                        teacher_id=new_id,
                        subject_name=q.subject_name,
                        min_grade=q.min_grade,
                        max_grade=q.max_grade,
                    )
                )
            if t.id:
                teacher_id_map[t.id] = new_id

        for c in data.classes:
            new_id = c.id or uuid.uuid4()
            class_obj = SchoolClass(
                id=new_id,
                tenant_id=tenant.id,
                name=c.name,
                grade_level=c.grade_level,
                contact_teacher_id=teacher_id_map.get(c.contact_teacher_id, c.contact_teacher_id),
                primary_room_id=room_id_map.get(c.primary_room_id, c.primary_room_id),
            )
            db.add(class_obj)
            if c.id:
                class_id_map[c.id] = new_id

        for s in data.subjects:
            db.add(
                Subject(
                    id=s.id or uuid.uuid4(),
                    tenant_id=tenant.id,
                    name=s.name,
                    grade_level=s.grade_level,
                    hours_per_week=s.hours_per_week,
                    requires_room_type=s.requires_room_type,
                    class_id=class_id_map.get(s.class_id, s.class_id),
                )
            )

        for ts in data.timeslots:
            db.add(
                Timeslot(
                    id=ts.id or uuid.uuid4(),
                    tenant_id=tenant.id,
                    slot_index=ts.slot_index,
                    start_time=ts.start_time,
                    end_time=ts.end_time,
                    label=ts.label,
                    period_type=ts.period_type,
                )
            )

        db.commit()
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(500, "Import failed — all changes have been rolled back.")

    return SetupImportResponse(
        replace_existing=payload.replace_existing,
        imported={
            "classes": len(data.classes),
            "teachers": len(data.teachers),
            "subjects": len(data.subjects),
            "rooms": len(data.rooms),
            "timeslots": len(data.timeslots),
        },
    )
