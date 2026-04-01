import uuid

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tenant import Tenant

# For Phase 1: use a single default tenant. Auth will replace this in Phase 3.
DEFAULT_TENANT_SLUG = "default"


def get_tenant(db: Session = Depends(get_db)) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.slug == DEFAULT_TENANT_SLUG).first()
    if not tenant:
        tenant = Tenant(id=uuid.uuid4(), name="Default School", slug=DEFAULT_TENANT_SLUG)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    return tenant
