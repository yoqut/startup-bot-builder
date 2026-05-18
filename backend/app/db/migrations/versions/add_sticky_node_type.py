"""add sticky node type

Revision ID: add_sticky_node_type
Revises: add_flow_chat_type
Create Date: 2026-05-07
"""

from alembic import op

revision = "add_sticky_node_type"
down_revision = "add_flow_chat_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'sticky'")


def downgrade() -> None:
    pass  # PostgreSQL enum values cannot be removed
