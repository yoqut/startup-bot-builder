"""add business_connections table and business_handler node type

Revision ID: add_business_connections
Revises: add_conversation_messages
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "add_business_connections"
down_revision = "add_conversation_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'business_handler'")

    op.create_table(
        "business_connections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "bot_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bots.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("connection_id", sa.String, nullable=False, unique=True),
        sa.Column("user_id", sa.BigInteger, nullable=False),
        sa.Column("user_chat_id", sa.BigInteger, nullable=False),
        sa.Column("username", sa.String, nullable=True),
        sa.Column("first_name", sa.String, nullable=True),
        sa.Column("last_name", sa.String, nullable=True),
        sa.Column("can_reply", sa.Boolean, default=True),
        sa.Column("is_enabled", sa.Boolean, default=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")
        ),
    )
    op.create_index(
        "ix_business_connections_bot_id", "business_connections", ["bot_id"]
    )
    op.create_index(
        "ix_business_connections_is_enabled", "business_connections", ["is_enabled"]
    )


def downgrade() -> None:
    op.drop_table("business_connections")
