"""add rapida flag to pop templates

Revision ID: c2f1a8b4d7e9
Revises: 8282d13b6718
Create Date: 2026-01-23 23:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2f1a8b4d7e9'
down_revision = '8282d13b6718'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'pop_templates',
        sa.Column('rapida', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )


def downgrade():
    op.drop_column('pop_templates', 'rapida')
