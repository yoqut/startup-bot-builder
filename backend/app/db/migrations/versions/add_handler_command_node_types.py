"""add handler and command node types

Revision ID: add_handler_command_node_types
Revises: add_telegram_id_to_users
Create Date: 2026-05-07
"""

from alembic import op

revision = "add_handler_command_node_types"
down_revision = "add_telegram_id_to_users"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'handler'")
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'command'")


def downgrade():
    pass
