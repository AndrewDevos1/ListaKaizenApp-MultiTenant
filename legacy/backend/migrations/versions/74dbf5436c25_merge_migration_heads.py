"""Merge migration heads

Revision ID: 74dbf5436c25
Revises: 32e43cab3e28, a1b2c3d4e5f6
Create Date: 2025-11-22 02:54:36.925575

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '74dbf5436c25'
down_revision = ('32e43cab3e28', 'a1b2c3d4e5f6')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
