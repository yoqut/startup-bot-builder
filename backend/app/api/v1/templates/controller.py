from __future__ import annotations

import logging
import uuid
from typing import Any

from litestar import Controller, delete, get, patch, post
from litestar.connection import Request
from litestar.di import Provide
from litestar.exceptions import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies import get_current_user_id
from app.api.v1.templates.schemas import (
    PublishFromFlowRequest,
    TemplateCreate,
    TemplateDetailOut,
    TemplateOut,
    TemplateReviewCreate,
    TemplateReviewOut,
    TemplateUpdate,
    UseTemplateRequest,
)
from app.db.session import get_db
from app.models.bot import Bot
from app.models.flow import Flow, FlowChatType
from app.models.flow_edge import FlowEdge
from app.models.flow_node import FlowNode, NodeType
from app.models.template import Template, TemplateReview, UserTemplate

logger = logging.getLogger(__name__)

CATEGORIES = [
    "E-commerce", "Support", "Booking", "FAQ", "Quiz", "Loyalty", "Other"
]


def _node_count(tmpl: Template) -> int:
    if not tmpl.flow_data:
        return 0
    return len(tmpl.flow_data.get("nodes", []))


def _to_out(tmpl: Template, user_id: uuid.UUID, unlocked_ids: set[uuid.UUID]) -> TemplateOut:
    return TemplateOut(
        id=str(tmpl.id),
        creator_id=str(tmpl.creator_id),
        title=tmpl.title,
        description=tmpl.description,
        category=tmpl.category,
        complexity=tmpl.complexity,
        price_stars=tmpl.price_stars,
        is_published=tmpl.is_published,
        is_featured=tmpl.is_featured,
        uses_count=tmpl.uses_count,
        avg_rating=round(tmpl.avg_rating, 1),
        review_count=tmpl.review_count,
        node_count=_node_count(tmpl),
        preview_url=tmpl.preview_url,
        created_at=tmpl.created_at,
        is_unlocked=(tmpl.id in unlocked_ids or tmpl.price_stars == 0 or tmpl.creator_id == user_id),
        is_own=(tmpl.creator_id == user_id),
    )


def _to_detail(tmpl: Template, user_id: uuid.UUID, unlocked_ids: set[uuid.UUID]) -> TemplateDetailOut:
    base = _to_out(tmpl, user_id, unlocked_ids)
    reviews = [
        TemplateReviewOut(
            id=str(r.id),
            user_id=str(r.user_id),
            template_id=str(r.template_id),
            rating=r.rating,
            comment=r.comment,
            reviewer_name=r.reviewer_name,
            created_at=r.created_at,
        )
        for r in (tmpl.reviews or [])
    ]
    return TemplateDetailOut(
        **base.model_dump(),
        reviews=reviews,
        flow_data=tmpl.flow_data if base.is_unlocked else None,
    )


async def _get_unlocked_ids(db: AsyncSession, user_id: uuid.UUID) -> set[uuid.UUID]:
    result = await db.execute(
        select(UserTemplate.template_id).where(UserTemplate.user_id == user_id)
    )
    return set(result.scalars().all())


class TemplatesController(Controller):
    path = "/api/v1/templates"
    dependencies = {"db": Provide(get_db)}

    # ── Marketplace ────────────────────────────────────────────────────────────

    @get("/")
    async def list_templates(
        self,
        request: Request,
        db: AsyncSession,
        category: str | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 24,
    ) -> list[TemplateOut]:
        user_id = uuid.UUID(get_current_user_id(request))

        stmt = select(Template).where(Template.is_published == True)
        if category and category in CATEGORIES:
            stmt = stmt.where(Template.category == category)
        if search:
            stmt = stmt.where(Template.title.ilike(f"%{search}%"))
        stmt = (
            stmt.order_by(
                Template.is_featured.desc(),
                Template.avg_rating.desc(),
                Template.uses_count.desc(),
                Template.created_at.desc(),
            )
            .offset((page - 1) * limit)
            .limit(limit)
        )

        rows = await db.execute(stmt)
        templates = rows.scalars().all()
        unlocked_ids = await _get_unlocked_ids(db, user_id)

        return [_to_out(t, user_id, unlocked_ids) for t in templates]

    @get("/categories")
    async def get_categories(self) -> list[str]:
        return CATEGORIES

    @get("/my")
    async def my_templates(self, request: Request, db: AsyncSession) -> list[TemplateOut]:
        user_id = uuid.UUID(get_current_user_id(request))

        created = (await db.execute(
            select(Template)
            .where(Template.creator_id == user_id)
            .order_by(Template.created_at.desc())
        )).scalars().all()

        purchased = (await db.execute(
            select(Template)
            .join(UserTemplate, UserTemplate.template_id == Template.id)
            .where(UserTemplate.user_id == user_id, Template.creator_id != user_id)
            .order_by(UserTemplate.unlocked_at.desc())
        )).scalars().all()

        unlocked_ids = {t.id for t in purchased} | {t.id for t in created}
        return [_to_out(t, user_id, unlocked_ids) for t in created + purchased]

    @get("/{template_id:str}")
    async def get_template(
        self, request: Request, template_id: str, db: AsyncSession
    ) -> TemplateDetailOut:
        user_id = uuid.UUID(get_current_user_id(request))
        result = await db.execute(
            select(Template)
            .options(selectinload(Template.reviews))
            .where(Template.id == uuid.UUID(template_id))
        )
        tmpl = result.scalar_one_or_none()
        if not tmpl or not tmpl.is_published:
            raise HTTPException(status_code=404, detail="Template topilmadi")
        unlocked_ids = await _get_unlocked_ids(db, user_id)
        return _to_detail(tmpl, user_id, unlocked_ids)

    @get("/{template_id:str}/preview")
    async def preview_template(
        self, request: Request, template_id: str, db: AsyncSession
    ) -> TemplateDetailOut:
        """Flow preview — faqat nodes/edges, to'liq ochilmagan flow_data."""
        user_id = uuid.UUID(get_current_user_id(request))
        result = await db.execute(
            select(Template)
            .options(selectinload(Template.reviews))
            .where(Template.id == uuid.UUID(template_id))
        )
        tmpl = result.scalar_one_or_none()
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template topilmadi")
        unlocked_ids = await _get_unlocked_ids(db, user_id)
        return _to_detail(tmpl, user_id, unlocked_ids)

    # ── Use template ───────────────────────────────────────────────────────────

    @post("/{template_id:str}/use")
    async def use_template(
        self, request: Request, template_id: str, data: UseTemplateRequest, db: AsyncSession
    ) -> dict[str, str]:
        user_id = uuid.UUID(get_current_user_id(request))

        tmpl = await db.get(Template, uuid.UUID(template_id))
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template topilmadi")

        # Access check
        if tmpl.price_stars > 0 and tmpl.creator_id != user_id:
            unlocked = await db.execute(
                select(UserTemplate).where(
                    UserTemplate.user_id == user_id,
                    UserTemplate.template_id == tmpl.id,
                )
            )
            if not unlocked.scalar_one_or_none():
                raise HTTPException(status_code=403, detail="Template sotib olinmagan")

        # Bot ownership check
        bot = await db.get(Bot, uuid.UUID(data.bot_id))
        if not bot or bot.user_id != user_id:
            raise HTTPException(status_code=404, detail="Bot topilmadi")

        # Create new flow
        flow = Flow(
            bot_id=bot.id,
            name=f"{tmpl.title}",
            chat_type=FlowChatType.user,
        )
        db.add(flow)
        await db.flush()

        # Import nodes and edges from flow_data
        if tmpl.flow_data:
            id_map: dict[str, uuid.UUID] = {}

            for node_data in tmpl.flow_data.get("nodes", []):
                new_id = uuid.uuid4()
                id_map[node_data["id"]] = new_id
                pos = node_data.get("position") or {}
                try:
                    node_type = NodeType(node_data["type"])
                except ValueError:
                    node_type = NodeType.message

                node = FlowNode(
                    id=new_id,
                    flow_id=flow.id,
                    type=node_type,
                    label=node_data.get("label"),
                    position_x=float(pos.get("x", 0)),
                    position_y=float(pos.get("y", 0)),
                    config=node_data.get("config") or {},
                )
                db.add(node)

            await db.flush()

            for edge_data in tmpl.flow_data.get("edges", []):
                src = id_map.get(edge_data.get("source", ""))
                tgt = id_map.get(edge_data.get("target", ""))
                if src and tgt:
                    db.add(FlowEdge(
                        flow_id=flow.id,
                        source_node_id=src,
                        target_node_id=tgt,
                        condition_key=edge_data.get("condition_key"),
                    ))

        tmpl.uses_count += 1
        await db.commit()

        return {"bot_id": str(bot.id), "flow_id": str(flow.id)}

    # ── Review ─────────────────────────────────────────────────────────────────

    @post("/{template_id:str}/review")
    async def add_review(
        self, request: Request, template_id: str, data: TemplateReviewCreate, db: AsyncSession
    ) -> TemplateReviewOut:
        user_id = uuid.UUID(get_current_user_id(request))

        tmpl = await db.get(Template, uuid.UUID(template_id))
        if not tmpl:
            raise HTTPException(status_code=404, detail="Template topilmadi")

        # Only owners/unlockers can review
        if tmpl.creator_id != user_id and tmpl.price_stars > 0:
            unlocked = await db.execute(
                select(UserTemplate).where(
                    UserTemplate.user_id == user_id,
                    UserTemplate.template_id == tmpl.id,
                )
            )
            if not unlocked.scalar_one_or_none():
                raise HTTPException(status_code=403, detail="Faqat sotib olganlar sharh yoza oladi")

        # Upsert — update if exists
        existing = await db.execute(
            select(TemplateReview).where(
                TemplateReview.user_id == user_id,
                TemplateReview.template_id == tmpl.id,
            )
        )
        review = existing.scalar_one_or_none()

        if review:
            review.rating = data.rating
            review.comment = data.comment
        else:
            from app.models.user import User
            user_row = await db.get(User, user_id)
            reviewer_name = getattr(user_row, "full_name", None) or getattr(user_row, "email", None)

            review = TemplateReview(
                user_id=user_id,
                template_id=tmpl.id,
                rating=data.rating,
                comment=data.comment,
                reviewer_name=reviewer_name,
            )
            db.add(review)

        await db.flush()

        # Recalculate avg_rating
        agg = await db.execute(
            select(func.avg(TemplateReview.rating), func.count(TemplateReview.id))
            .where(TemplateReview.template_id == tmpl.id)
        )
        avg, cnt = agg.one()
        tmpl.avg_rating = float(avg or 0)
        tmpl.review_count = int(cnt or 0)

        await db.commit()
        await db.refresh(review)

        return TemplateReviewOut(
            id=str(review.id),
            user_id=str(review.user_id),
            template_id=str(review.template_id),
            rating=review.rating,
            comment=review.comment,
            reviewer_name=review.reviewer_name,
            created_at=review.created_at,
        )

    # ── Create & manage ────────────────────────────────────────────────────────

    @post("/")
    async def create_template(
        self, request: Request, data: TemplateCreate, db: AsyncSession
    ) -> TemplateOut:
        user_id = uuid.UUID(get_current_user_id(request))
        tmpl = Template(
            creator_id=user_id,
            title=data.title,
            description=data.description,
            category=data.category,
            complexity=data.complexity,
            price_stars=data.price_stars,
            flow_data=data.flow_data,
            preview_url=data.preview_url,
        )
        db.add(tmpl)
        await db.commit()
        await db.refresh(tmpl)
        return _to_out(tmpl, user_id, set())

    @post("/publish-from-flow")
    async def publish_from_flow(
        self, request: Request, data: PublishFromFlowRequest, db: AsyncSession
    ) -> TemplateOut:
        user_id = uuid.UUID(get_current_user_id(request))

        flow_uuid = uuid.UUID(data.flow_id)
        flow_row = await db.execute(select(Flow).where(Flow.id == flow_uuid))
        flow = flow_row.scalar_one_or_none()
        if not flow:
            raise HTTPException(status_code=404, detail="Flow topilmadi")

        nodes_rows = await db.execute(select(FlowNode).where(FlowNode.flow_id == flow_uuid))
        edges_rows = await db.execute(select(FlowEdge).where(FlowEdge.flow_id == flow_uuid))
        nodes = nodes_rows.scalars().all()
        edges = edges_rows.scalars().all()

        flow_data = {
            "nodes": [
                {
                    "id": str(n.id),
                    "type": n.type.value if hasattr(n.type, "value") else n.type,
                    "label": n.label,
                    "config": n.config,
                    "position": {"x": n.position_x or 0, "y": n.position_y or 0},
                }
                for n in nodes
            ],
            "edges": [
                {
                    "source": str(e.source_node_id),
                    "target": str(e.target_node_id),
                    "condition_key": e.condition_key,
                }
                for e in edges
            ],
        }

        tmpl = Template(
            creator_id=user_id,
            title=data.title,
            description=data.description,
            category=data.category,
            complexity=data.complexity,
            price_stars=data.price_stars,
            flow_data=flow_data,
            is_published=True,
        )
        db.add(tmpl)
        await db.commit()
        await db.refresh(tmpl)
        return _to_out(tmpl, user_id, {tmpl.id})

    @patch("/{template_id:str}")
    async def update_template(
        self, request: Request, template_id: str, data: TemplateUpdate, db: AsyncSession
    ) -> TemplateOut:
        user_id = uuid.UUID(get_current_user_id(request))
        tmpl = await db.get(Template, uuid.UUID(template_id))
        if not tmpl or tmpl.creator_id != user_id:
            raise HTTPException(status_code=404, detail="Template topilmadi")

        for field, value in data.model_dump(exclude_none=True).items():
            setattr(tmpl, field, value)
        await db.commit()
        await db.refresh(tmpl)
        return _to_out(tmpl, user_id, {tmpl.id})

    @post("/{template_id:str}/publish")
    async def publish_template(
        self, request: Request, template_id: str, db: AsyncSession
    ) -> TemplateOut:
        user_id = uuid.UUID(get_current_user_id(request))
        tmpl = await db.get(Template, uuid.UUID(template_id))
        if not tmpl or tmpl.creator_id != user_id:
            raise HTTPException(status_code=404, detail="Template topilmadi")
        tmpl.is_published = True
        await db.commit()
        await db.refresh(tmpl)
        return _to_out(tmpl, user_id, {tmpl.id})

    @post("/{template_id:str}/unpublish")
    async def unpublish_template(
        self, request: Request, template_id: str, db: AsyncSession
    ) -> TemplateOut:
        user_id = uuid.UUID(get_current_user_id(request))
        tmpl = await db.get(Template, uuid.UUID(template_id))
        if not tmpl or tmpl.creator_id != user_id:
            raise HTTPException(status_code=404, detail="Template topilmadi")
        tmpl.is_published = False
        await db.commit()
        await db.refresh(tmpl)
        return _to_out(tmpl, user_id, {tmpl.id})

    @delete("/{template_id:str}")
    async def delete_template(
        self, request: Request, template_id: str, db: AsyncSession
    ) -> None:
        user_id = uuid.UUID(get_current_user_id(request))
        tmpl = await db.get(Template, uuid.UUID(template_id))
        if not tmpl or tmpl.creator_id != user_id:
            raise HTTPException(status_code=404, detail="Template topilmadi")
        await db.delete(tmpl)
        await db.commit()
