"""add system_settings table

Revision ID: add_system_settings
Revises: add_node_types_v2
Create Date: 2026-05-06
"""

from alembic import op
import sqlalchemy as sa

revision = "add_system_settings"
down_revision = "add_node_types_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    # Seed default editable settings
    op.execute("""
        INSERT INTO system_settings (key, value, description) VALUES
        ('WEBHOOK_BASE_URL', '', 'Telegram webhook uchun asosiy URL'),
        ('OPENAI_API_KEY',   '', 'OpenAI API kaliti (AI node uchun)'),
        ('REGISTRATION_OPEN', 'true', 'Yangi foydalanuvchilar ro''yxatdan o''ta oladimi'),
        ('MAX_BOTS_FREE', '3', 'Bepul plandagi maksimal bot soni'),
        ('SUPPORT_USERNAME', '', 'Telegram support username (masalan @support)')
        ON CONFLICT (key) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table("system_settings")
