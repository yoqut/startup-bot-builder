"""add templates and payments

Revision ID: add_templates_and_payments
Revises: add_telegram_id_to_users
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "add_templates_and_payments"
down_revision = "add_handler_command_node_types"
branch_labels = None
depends_on = None


def upgrade():
    # ── templates ──────────────────────────────────────────────────────────────
    op.create_table(
        "templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "creator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("price_stars", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("flow_data", postgresql.JSONB, nullable=True),
        sa.Column("preview_url", sa.String(500), nullable=True),
        sa.Column("uses_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_templates_creator_id", "templates", ["creator_id"])
    op.create_index("ix_templates_is_published", "templates", ["is_published"])
    op.create_index("ix_templates_category", "templates", ["category"])

    # ── user_templates (unlock table) ─────────────────────────────────────────
    op.create_table(
        "user_templates",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("templates.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "unlocked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ── payments ──────────────────────────────────────────────────────────────
    payment_status = postgresql.ENUM(
        "pending", "completed", "refunded", name="paymentstatus", create_type=False
    )
    payment_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("telegram_payment_charge_id", sa.String, unique=True, nullable=True),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="XTR"),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending", "completed", "refunded",
                name="paymentstatus", create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("payload", sa.String(500), unique=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_payments_user_id", "payments", ["user_id"])
    op.create_index("ix_payments_status", "payments", ["status"])


def downgrade():
    op.drop_table("payments")
    op.drop_table("user_templates")
    op.drop_table("templates")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
