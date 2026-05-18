"""add conversation_messages table

Revision ID: add_conversation_messages
Revises: add_system_settings
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa

revision = "add_conversation_messages"
down_revision = "add_new_node_types"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conversation_messages",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "bot_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("bots.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("telegram_id", sa.BigInteger, nullable=False),
        sa.Column("username", sa.String, nullable=True),
        sa.Column("first_name", sa.String, nullable=True),
        sa.Column("direction", sa.String(3), nullable=False),
        sa.Column("message_type", sa.String(20), nullable=False, server_default="text"),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("media_url", sa.String, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_conv_bot_telegram", "conversation_messages", ["bot_id", "telegram_id"]
    )


def downgrade() -> None:
    op.drop_table("conversation_messages")
