"""add chat_type to flows

Revision ID: add_flow_chat_type
Revises: add_business_connections
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa

revision = "add_flow_chat_type"
down_revision = "add_business_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flowchattype') THEN CREATE TYPE flowchattype AS ENUM ('user', 'group', 'channel', 'business'); END IF; END $$"
    )
    op.add_column(
        "flows",
        sa.Column(
            "chat_type",
            sa.Enum("user", "group", "channel", "business", name="flowchattype"),
            nullable=False,
            server_default="user",
        ),
    )
    op.create_index("ix_flows_bot_chat_type", "flows", ["bot_id", "chat_type"])


def downgrade() -> None:
    op.drop_index("ix_flows_bot_chat_type", "flows")
    op.drop_column("flows", "chat_type")
