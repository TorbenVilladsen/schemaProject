import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.teacher import Teacher, TeacherQualification, TeacherAvailability
from app.schemas.teacher import TeacherCreate, TeacherRead, TeacherUpdate

router = APIRouter()


@router.get("/teachers", response_model=list[TeacherRead])
def list_teachers(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return (
        db.query(Teacher)
        .options(selectinload(Teacher.qualifications), selectinload(Teacher.availability))
        .filter(Teacher.tenant_id == tenant.id)
        .all()
    )


@router.post("/teachers", response_model=TeacherRead, status_code=201)
def create_teacher(
    data: TeacherCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    teacher = Teacher(
        tenant_id=tenant.id,
        name=data.name,
        max_hours_week=data.max_hours_week,
        max_hours_day=data.max_hours_day,
    )
    for q in data.qualifications:
        teacher.qualifications.append(
            TeacherQualification(
                subject_name=q.subject_name,
                min_grade=q.min_grade,
                max_grade=q.max_grade,
            )
        )
    for a in data.availability:
        teacher.availability.append(
            TeacherAvailability(
                day_of_week=a.day_of_week,
                timeslot_id=a.timeslot_id,
                is_available=a.is_available,
                preference=a.preference,
            )
        )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


@router.get("/teachers/{teacher_id}", response_model=TeacherRead)
def get_teacher(
    teacher_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    teacher = (
        db.query(Teacher)
        .options(selectinload(Teacher.qualifications), selectinload(Teacher.availability))
        .filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant.id)
        .first()
    )
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    return teacher


@router.put("/teachers/{teacher_id}", response_model=TeacherRead)
def update_teacher(
    teacher_id: uuid.UUID,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    teacher = (
        db.query(Teacher)
        .options(selectinload(Teacher.availability))
        .filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant.id)
        .first()
    )
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    payload = data.model_dump(exclude_unset=True)
    availability = payload.pop("availability", None)
    for field, value in payload.items():
        setattr(teacher, field, value)
    if availability is not None:
        db.query(TeacherAvailability).filter(TeacherAvailability.teacher_id == teacher.id).delete(
            synchronize_session=False
        )
        db.flush()
        for a in availability:
            db.add(
                TeacherAvailability(
                    teacher_id=teacher.id,
                    day_of_week=a["day_of_week"],
                    timeslot_id=a["timeslot_id"],
                    is_available=a.get("is_available", True),
                    preference=a.get("preference", 0),
                ),
            )
    db.commit()
    db.refresh(teacher)
    return teacher


@router.delete("/teachers/{teacher_id}", status_code=204)
def delete_teacher(
    teacher_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant.id).first()
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    db.delete(teacher)
    db.commit()
