import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter()


@router.get("/subjects", response_model=list[SubjectRead])
def list_subjects(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return db.query(Subject).filter(Subject.tenant_id == tenant.id).all()


@router.post("/subjects", response_model=SubjectRead, status_code=201)
def create_subject(
    data: SubjectCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    subject = Subject(tenant_id=tenant.id, **data.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/subjects/{subject_id}", response_model=SubjectRead)
def get_subject(
    subject_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.tenant_id == tenant.id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")
    return subject


@router.put("/subjects/{subject_id}", response_model=SubjectRead)
def update_subject(
    subject_id: uuid.UUID,
    data: SubjectUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.tenant_id == tenant.id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    db.commit()
    db.refresh(subject)
    return subject


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.tenant_id == tenant.id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")
    db.delete(subject)
    db.commit()
