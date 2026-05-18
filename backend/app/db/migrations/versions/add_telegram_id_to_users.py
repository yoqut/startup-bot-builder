"""add telegram_id to users

Revision ID: add_telegram_id_to_users
Revises: add_sticky_node_type
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa

revision = "add_telegram_id_to_users"
down_revision = "add_sticky_node_type"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.create_unique_constraint("uq_users_telegram_id", "users", ["telegram_id"])
    op.alter_column("users", "password_hash", nullable=True)


def downgrade():
    op.alter_column("users", "password_hash", nullable=False)
    op.drop_constraint("uq_users_telegram_id", "users", type_="unique")
    op.drop_column("users", "telegram_id")
