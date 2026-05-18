"""add template reviews and extended template fields

Revision ID: add_template_reviews
Revises: add_templates_and_payments
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "add_template_reviews"
down_revision = "add_templates_and_payments"
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to templates
    op.add_column("templates", sa.Column("complexity", sa.String(20), nullable=True))
    op.add_column("templates", sa.Column("is_featured", sa.Boolean, nullable=False, server_default="false"))
    op.add_column("templates", sa.Column("avg_rating", sa.Float, nullable=False, server_default="0"))
    op.add_column("templates", sa.Column("review_count", sa.Integer, nullable=False, server_default="0"))

    # Create template_reviews table
    op.create_table(
        "template_reviews",
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
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("reviewer_name", sa.String(100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "template_id", name="uq_template_reviews_user_template"),
    )
    op.create_index("ix_template_reviews_template_id", "template_reviews", ["template_id"])
    op.create_index("ix_template_reviews_user_id", "template_reviews", ["user_id"])


def downgrade():
    op.drop_table("template_reviews")
    op.drop_column("templates", "review_count")
    op.drop_column("templates", "avg_rating")
    op.drop_column("templates", "is_featured")
    op.drop_column("templates", "complexity")
