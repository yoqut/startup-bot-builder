"""add delay and set_variable node types

Revision ID: add_node_types_v2
Revises: 1fe25ae80d8c
Create Date: 2026-05-06
"""

from alembic import op

revision = "add_node_types_v2"
down_revision = "1fe25ae80d8c"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'delay'")
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'set_variable'")


def downgrade():
    pass  # PostgreSQL enum values cannot be removed
