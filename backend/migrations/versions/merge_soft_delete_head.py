"""Merge soft delete head with main migration tree

Revision ID: merge_soft_delete_head
Revises: 74dbf5436c25, soft_delete_listas
Create Date: 2025-12-23 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'merge_soft_delete_head'
down_revision = ('74dbf5436c25', 'soft_delete_listas')
branch_labels = None
depends_on = None


def upgrade():
    # Merge migration - no changes needed
    pass


def downgrade():
    # Merge migration - no changes needed
    pass
