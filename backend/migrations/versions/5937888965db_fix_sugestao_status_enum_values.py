"""Fix sugestao status enum values

Revision ID: 5937888965db
Revises: 6126b4929b0b
Create Date: 2025-12-27 17:07:53.225396

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5937888965db'
down_revision = '6126b4929b0b'
branch_labels = None
depends_on = None


def upgrade():
    # Dropar o enum antigo e recriar com valores corretos
    op.execute("ALTER TYPE sugestaostatus RENAME TO sugestaostatus_old")
    op.execute("CREATE TYPE sugestaostatus AS ENUM ('pendente', 'aprovada', 'rejeitada')")
    op.execute("ALTER TABLE sugestoes_itens ALTER COLUMN status TYPE sugestaostatus USING status::text::sugestaostatus")
    op.execute("DROP TYPE sugestaostatus_old")


def downgrade():
    pass
