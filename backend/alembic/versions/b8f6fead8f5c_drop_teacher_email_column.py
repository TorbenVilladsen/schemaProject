"""drop teacher email column

Revision ID: b8f6fead8f5c
Revises: a79ee9f7d365
Create Date: 2026-04-02 22:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8f6fead8f5c"
down_revision: Union[str, Sequence[str], None] = "a79ee9f7d365"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("teachers", "email")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("teachers", sa.Column("email", sa.String(length=255), nullable=True))
