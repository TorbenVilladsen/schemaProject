import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_tenant
from app.models.tenant import Tenant
from app.models.school_class import SchoolClass
from app.schemas.school_class import SchoolClassCreate, SchoolClassRead, SchoolClassUpdate

router = APIRouter()


@router.get("/classes", response_model=list[SchoolClassRead])
def list_classes(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    return db.query(SchoolClass).filter(SchoolClass.tenant_id == tenant.id).all()


@router.post("/classes", response_model=SchoolClassRead, status_code=201)
def create_class(
    data: SchoolClassCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    school_class = SchoolClass(tenant_id=tenant.id, **data.model_dump())
    db.add(school_class)
    db.commit()
    db.refresh(school_class)
    return school_class


@router.get("/classes/{class_id}", response_model=SchoolClassRead)
def get_class(
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id, SchoolClass.tenant_id == tenant.id
    ).first()
    if not school_class:
        raise HTTPException(404, "Class not found")
    return school_class


@router.put("/classes/{class_id}", response_model=SchoolClassRead)
def update_class(
    class_id: uuid.UUID,
    data: SchoolClassUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id, SchoolClass.tenant_id == tenant.id
    ).first()
    if not school_class:
        raise HTTPException(404, "Class not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(school_class, field, value)
    db.commit()
    db.refresh(school_class)
    return school_class


@router.delete("/classes/{class_id}", status_code=204)
def delete_class(
    class_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant),
):
    school_class = db.query(SchoolClass).filter(
        SchoolClass.id == class_id, SchoolClass.tenant_id == tenant.id
    ).first()
    if not school_class:
        raise HTTPException(404, "Class not found")
    db.delete(school_class)
    db.commit()
