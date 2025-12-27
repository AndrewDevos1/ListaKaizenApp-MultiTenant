"""Merge migration heads

Revision ID: 6126b4929b0b
Revises: 35cb89d7ecce, abc123sugestoes
Create Date: 2025-12-27 17:03:37.001473

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6126b4929b0b'
down_revision = ('35cb89d7ecce', 'abc123sugestoes')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
