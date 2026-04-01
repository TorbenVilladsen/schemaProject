import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.teacher import Teacher, TeacherQualification
from app.schemas.teacher import TeacherCreate, TeacherRead, TeacherUpdate

router = APIRouter()


@router.get("/teachers", response_model=list[TeacherRead])
def list_teachers(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return (
        db.query(Teacher)
        .options(joinedload(Teacher.qualifications))
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
        email=data.email,
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
        .options(joinedload(Teacher.qualifications))
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
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant.id).first()
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(teacher, field, value)
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
