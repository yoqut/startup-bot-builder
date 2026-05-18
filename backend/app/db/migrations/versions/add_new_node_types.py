"""add auto_delete and send_to node types

Revision ID: add_new_node_types
Revises: add_system_settings
Create Date: 2026-05-06
"""

from alembic import op

revision = "add_new_node_types"
down_revision = "add_system_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'auto_delete'")
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'send_to'")


def downgrade() -> None:
    pass  # PostgreSQL enum values cannot be removed
