import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.analytic_event import AnalyticEvent, EventType
from app.models.bot_user import BotUser
from app.models.business_connection import BusinessConnection
from app.models.conversation import ConversationMessage
from app.models.flow import Flow
from app.models.flow_node import FlowNode, NodeType
from app.runtime import state as state_manager
from app.runtime.engine import execute_flow
from app.runtime.nodes.handler import HandlerNode
from app.runtime.nodes.business_handler import BusinessHandlerNode
from app.utils.encryption import decrypt_token

logger = logging.getLogger(__name__)


# ── Update parser ─────────────────────────────────────────────────────────────


def _parse_update(update: dict) -> dict | None:
    """
    Returns a normalized dict:
      type: text | command | photo | video | audio | voice | document |
             sticker | location | contact | callback | join_request | left_member | any
      chat_type: private | group | supergroup | channel
      from: telegram user dict
      chat_id: int
      text: str | None
      callback_data: str | None
      raw: original sub-dict
    """
    info: dict = {
        "text": None,
        "callback_data": None,
        "callback_message_id": None,
        "chat_type": "private",
    }

    if "message" in update:
        msg = update["message"]
        info["from"] = msg.get("from", {})
        info["chat_id"] = msg["chat"]["id"]
        info["chat_type"] = msg["chat"].get("type", "private")
        info["raw"] = msg

        # Special group events
        if msg.get("new_chat_members"):
            info["type"] = "join_request"
            return info
        if msg.get("left_chat_member"):
            info["type"] = "left_member"
            return info

        text = msg.get("text", "")
        if text:
            info["text"] = text
            if text.startswith("/"):
                # strip bot mention: /start@MyBot → /start
                cmd = text.strip().split()[0].split("@")[0].lower()
                info["text"] = cmd + text[len(text.strip().split()[0]) :]
                info["type"] = "command"
            else:
                info["type"] = "text"
        elif "photo" in msg:
            info["type"] = "photo"
        elif "video" in msg:
            info["type"] = "video"
        elif "audio" in msg:
            info["type"] = "audio"
        elif "voice" in msg:
            info["type"] = "voice"
        elif "document" in msg:
            info["type"] = "document"
        elif "sticker" in msg:
            info["type"] = "sticker"
        elif "location" in msg:
            info["type"] = "location"
        elif "contact" in msg:
            info["type"] = "contact"
        else:
            info["type"] = "any"

    elif "channel_post" in update:
        # Channel posts — no "from" user, use bot/channel as sender
        msg = update["channel_post"]
        info["from"] = {
            "id": msg["chat"]["id"],
            "first_name": msg["chat"].get("title", "Channel"),
        }
        info["chat_id"] = msg["chat"]["id"]
        info["chat_type"] = "channel"
        info["raw"] = msg

        text = msg.get("text", "")
        if text:
            info["text"] = text
            info["type"] = "text"
        elif "photo" in msg:
            info["type"] = "photo"
        elif "video" in msg:
            info["type"] = "video"
        elif "audio" in msg:
            info["type"] = "audio"
        elif "document" in msg:
            info["type"] = "document"
        else:
            info["type"] = "any"

    elif "chat_join_request" in update:
        req = update["chat_join_request"]
        info["from"] = req.get("from", {})
        info["chat_id"] = req["chat"]["id"]
        info["chat_type"] = req["chat"].get("type", "group")
        info["type"] = "join_request"
        info["raw"] = req

    elif "callback_query" in update:
        cq = update["callback_query"]
        info["from"] = cq.get("from", {})
        info["chat_id"] = cq["message"]["chat"]["id"]
        info["chat_type"] = cq["message"]["chat"].get("type", "private")
        info["callback_data"] = cq.get("data", "")
        info["callback_message_id"] = cq["message"].get("message_id")
        info["type"] = "callback"
        info["raw"] = cq

    else:
        return None

    if not info.get("from") or not info.get("chat_id"):
        return None

    return info


# ── Main dispatcher ───────────────────────────────────────────────────────────


async def dispatch(
    db: AsyncSession, bot_id: str, encrypted_token: str, update: dict
) -> None:
    bot_token = decrypt_token(encrypted_token)

    # ── Business connection events ────────────────────────────────────────────
    if "business_connection" in update:
        await _handle_business_connection(
            db, bot_id, bot_token, update["business_connection"]
        )
        return

    # ── Business messages ─────────────────────────────────────────────────────
    if "business_message" in update:
        await _handle_business_message(
            db, bot_id, bot_token, update["business_message"]
        )
        return

    info = _parse_update(update)
    if not info:
        return

    update_type: str = info["type"]
    telegram_user: dict = info["from"]
    chat_id: int = info["chat_id"]
    message_text: str | None = info["text"]
    callback_data: str | None = info["callback_data"]
    callback_message_id: int | None = info.get("callback_message_id")

    # Determine chat_type for flow routing
    raw_chat_type = info.get("chat_type", "private")
    if raw_chat_type in ("group", "supergroup"):
        flow_chat_type = "group"
    elif raw_chat_type == "channel":
        flow_chat_type = "channel"
    else:
        flow_chat_type = "user"

    telegram_id = telegram_user["id"]
    bot_user = await _get_or_create_bot_user(db, bot_id, telegram_user)

    # Log analytic event (committed together below)
    await _log_event(db, bot_id, bot_user.id, update_type, message_text)

    # Save incoming conversation message
    if message_text and update_type not in ("callback",):
        db.add(
            ConversationMessage(
                bot_id=uuid.UUID(bot_id),
                telegram_id=telegram_id,
                username=telegram_user.get("username"),
                first_name=telegram_user.get("first_name"),
                direction="in",
                message_type=update_type,
                content=message_text[:4000],
            )
        )

    await db.commit()

    current_state = await state_manager.get_state(bot_id, telegram_id)
    current_node_id = current_state.get("current_node_id")

    # ── Inline callback → jump directly to target node ────────────────────────
    if (
        update_type == "callback"
        and callback_data
        and callback_data.startswith("node:")
    ):
        target = callback_data.replace("node:", "").strip()
        if target:
            await execute_flow(
                db=db,
                bot_id=bot_id,
                bot_token=bot_token,
                telegram_user_id=telegram_id,
                chat_id=chat_id,
                start_node_id=target,
                message_text=None,
                callback_data=callback_data,
                callback_message_id=callback_message_id,
            )
            return

    # ── Waiting for user input → resume current node ──────────────────────────
    if current_node_id and update_type != "callback":
        await execute_flow(
            db=db,
            bot_id=bot_id,
            bot_token=bot_token,
            telegram_user_id=telegram_id,
            chat_id=chat_id,
            start_node_id=current_node_id,
            message_text=message_text,
        )
        return

    # ── Find matching Handler node (new system) ───────────────────────────────
    handler_node = await _find_handler_node(
        db, bot_id, update_type, info, flow_chat_type
    )
    logger.info(
        "Dispatch bot=%s type=%s chat_type=%s handler=%s",
        bot_id,
        update_type,
        flow_chat_type,
        handler_node and str(handler_node.id),
    )
    if handler_node:
        await execute_flow(
            db=db,
            bot_id=bot_id,
            bot_token=bot_token,
            telegram_user_id=telegram_id,
            chat_id=chat_id,
            start_node_id=str(handler_node.id),
            message_text=message_text,
            callback_data=callback_data,
        )
        return

    # ── Fallback: old command/start nodes (backward compat) ───────────────────
    if update_type == "command" and message_text:
        cmd_node = await _find_command_node(db, bot_id, message_text, flow_chat_type)
        if cmd_node:
            await execute_flow(
                db=db,
                bot_id=bot_id,
                bot_token=bot_token,
                telegram_user_id=telegram_id,
                chat_id=chat_id,
                start_node_id=str(cmd_node.id),
                message_text=message_text,
            )
            return

    # ── Last resort: /start node ──────────────────────────────────────────────
    if not current_node_id:
        start_node = await _get_start_node(db, bot_id, flow_chat_type)
        if start_node:
            await execute_flow(
                db=db,
                bot_id=bot_id,
                bot_token=bot_token,
                telegram_user_id=telegram_id,
                chat_id=chat_id,
                start_node_id=str(start_node.id),
                message_text=message_text,
            )


# ── Handler matching ──────────────────────────────────────────────────────────


async def _find_handler_node(
    db: AsyncSession,
    bot_id: str,
    update_type: str,
    payload: dict,
    chat_type: str = "user",
) -> FlowNode | None:
    flow = await _get_published_flow(db, bot_id, chat_type)
    if not flow:
        return None

    result = await db.execute(
        select(FlowNode).where(
            FlowNode.flow_id == flow.id,
            FlowNode.type == NodeType.handler,
        )
    )
    nodes = result.scalars().all()

    for node in nodes:
        executor = HandlerNode(str(node.id), node.config)
        if executor.matches(update_type, payload):
            return node
    return None


# ── Legacy helpers ────────────────────────────────────────────────────────────


async def _find_command_node(
    db: AsyncSession, bot_id: str, message_text: str, chat_type: str = "user"
) -> FlowNode | None:
    flow = await _get_published_flow(db, bot_id, chat_type)
    if not flow:
        return None

    result = await db.execute(
        select(FlowNode).where(
            FlowNode.flow_id == flow.id,
            FlowNode.type.in_([NodeType.command, NodeType.start]),
        )
    )
    nodes = result.scalars().all()
    cmd = message_text.strip().split()[0].lower()
    for node in nodes:
        node_cmd = node.config.get("command", "/start").strip().lower()
        if cmd == node_cmd:
            return node
    return None


async def _get_start_node(
    db: AsyncSession, bot_id: str, chat_type: str = "user"
) -> FlowNode | None:
    flow = await _get_published_flow(db, bot_id, chat_type)
    if not flow:
        return None
    result = await db.execute(
        select(FlowNode)
        .where(
            FlowNode.flow_id == flow.id,
            FlowNode.type.in_([NodeType.start, NodeType.command, NodeType.handler]),
        )
        .order_by(FlowNode.type)
    )
    return result.scalars().first()


async def _get_published_flow(
    db: AsyncSession, bot_id: str, chat_type: str = "user"
) -> Flow | None:
    from app.models.flow import FlowChatType

    result = await db.execute(
        select(Flow)
        .where(
            Flow.bot_id == uuid.UUID(bot_id),
            Flow.is_published == bool(True),
            Flow.chat_type == FlowChatType(chat_type),
        )
        .order_by(Flow.version.desc())
    )
    return result.scalar_one_or_none()


async def _log_event(
    db: AsyncSession, bot_id: str, bot_user_id, update_type: str, text: str | None
) -> None:
    type_map = {
        "command": EventType.start,
        "callback": EventType.button_click,
        "text": EventType.message,
        "photo": EventType.message,
        "video": EventType.message,
        "audio": EventType.message,
        "voice": EventType.message,
        "document": EventType.message,
        "sticker": EventType.message,
        "location": EventType.message,
        "contact": EventType.message,
    }
    event_type = type_map.get(update_type, EventType.message)
    meta = {}
    if text:
        meta["text"] = text[:200]
    event = AnalyticEvent(
        bot_id=uuid.UUID(bot_id),
        bot_user_id=bot_user_id,
        event_type=event_type,
        event_metadata=meta,
    )
    db.add(event)


async def _handle_business_connection(
    db: AsyncSession, bot_id: str, bot_token: str, bc: dict
) -> None:
    """Save/update BusinessConnection and trigger business_connected/disconnected flow."""
    connection_id = bc.get("id", "")
    user = bc.get("user", {})
    user_id = user.get("id")
    if not connection_id or not user_id:
        return

    result = await db.execute(
        select(BusinessConnection).where(
            BusinessConnection.connection_id == connection_id
        )
    )
    existing = result.scalar_one_or_none()
    is_enabled = bc.get("is_enabled", True)

    if existing:
        existing.is_enabled = is_enabled
        existing.can_reply = bc.get("can_reply", True)
    else:
        db.add(
            BusinessConnection(
                bot_id=uuid.UUID(bot_id),
                connection_id=connection_id,
                user_id=user_id,
                user_chat_id=bc.get("user_chat_id", user_id),
                username=user.get("username"),
                first_name=user.get("first_name"),
                last_name=user.get("last_name"),
                can_reply=bc.get("can_reply", True),
                is_enabled=is_enabled,
            )
        )
    await db.commit()

    # Trigger flow: business_connected or business_disconnected
    event_type = "business_connected" if is_enabled else "business_disconnected"
    payload = {"business_connection_id": connection_id, "chat_type": "private"}
    handler = await _find_business_handler_node(
        db, bot_id, event_type, payload, "business"
    )
    if handler:
        user_chat_id = bc.get("user_chat_id", user_id)
        await execute_flow(
            db=db,
            bot_id=bot_id,
            bot_token=bot_token,
            telegram_user_id=user_id,
            chat_id=user_chat_id,
            start_node_id=str(handler.id),
            business_connection_id=connection_id,
        )


async def _handle_business_message(
    db: AsyncSession, bot_id: str, bot_token: str, msg: dict
) -> None:
    """Handle incoming message in a business chat."""
    from_user = msg.get("from", {})
    if not from_user:
        return

    connection_id = msg.get("business_connection_id", "")
    chat_id = msg["chat"]["id"]
    telegram_id = from_user["id"]
    text = msg.get("text", "") or ""

    # Detect actual message subtype (mirrors _parse_update logic)
    if text.startswith("/"):
        msg_type = "command"
    elif text:
        msg_type = "text"
    elif "photo" in msg:
        msg_type = "photo"
    elif "video" in msg:
        msg_type = "video"
    elif "audio" in msg:
        msg_type = "audio"
    elif "voice" in msg:
        msg_type = "voice"
    elif "document" in msg:
        msg_type = "document"
    elif "location" in msg:
        msg_type = "location"
    elif "contact" in msg:
        msg_type = "contact"
    else:
        msg_type = "any"

    # Determine if this message is from the business connection owner (not a customer).
    # Telegram sends business_message for BOTH sides of the chat. We look up the
    # BusinessConnection to find the owner's telegram_id, then mark owner messages so
    # handlers can filter them out via sender_type config.
    is_owner_message = False
    if connection_id:
        result = await db.execute(
            select(BusinessConnection).where(
                BusinessConnection.connection_id == connection_id
            )
        )
        bc = result.scalar_one_or_none()
        if bc and bc.user_id == telegram_id:
            is_owner_message = True

    # Save conversation log (only customer messages; owner outgoing are not "in")
    if text and not is_owner_message:
        db.add(
            ConversationMessage(
                bot_id=uuid.UUID(bot_id),
                telegram_id=telegram_id,
                username=from_user.get("username"),
                first_name=from_user.get("first_name"),
                direction="in",
                message_type=msg_type,
                content=text[:4000],
            )
        )
        await db.commit()
    elif is_owner_message:
        # Log owner's outgoing message as "out" direction
        if text:
            db.add(
                ConversationMessage(
                    bot_id=uuid.UUID(bot_id),
                    telegram_id=telegram_id,
                    username=from_user.get("username"),
                    first_name=from_user.get("first_name"),
                    direction="out",
                    message_type=msg_type,
                    content=text[:4000],
                )
            )
            await db.commit()

    # Only auto-respond to customer messages (not the owner's own messages)
    if is_owner_message:
        return

    # Find matching business_handler node first (dedicated business flow)
    payload = {
        "business_connection_id": connection_id,
        "text": text,
        "msg_type": msg_type,
        "chat_type": "private",
        "is_owner_message": is_owner_message,
    }
    handler = await _find_business_handler_node(
        db, bot_id, "business_message", payload, "business"
    )

    # Fallback: if no business flow published, use the regular user flow
    # business_connection_id is passed to execute_flow so replies go through the business chat
    if not handler:
        user_payload = {"text": text, "chat_type": "private"}
        handler = await _find_handler_node(db, bot_id, msg_type, user_payload, "user")
        if not handler and msg_type == "command" and text:
            handler = await _find_command_node(db, bot_id, text, "user")
        if not handler:
            handler = await _get_start_node(db, bot_id, "user")

    if handler:
        await execute_flow(
            db=db,
            bot_id=bot_id,
            bot_token=bot_token,
            telegram_user_id=telegram_id,
            chat_id=chat_id,
            start_node_id=str(handler.id),
            message_text=text or None,
            business_connection_id=connection_id,
        )


async def _find_business_handler_node(
    db: AsyncSession,
    bot_id: str,
    update_type: str,
    payload: dict,
    chat_type: str = "business",
) -> FlowNode | None:
    flow = await _get_published_flow(db, bot_id, chat_type)
    if not flow:
        return None

    result = await db.execute(
        select(FlowNode).where(
            FlowNode.flow_id == flow.id,
            FlowNode.type == NodeType.business_handler,
        )
    )
    nodes = result.scalars().all()
    for node in nodes:
        executor = BusinessHandlerNode(str(node.id), node.config)
        if executor.matches(update_type, payload):
            return node
    return None


async def _get_or_create_bot_user(
    db: AsyncSession, bot_id: str, tg_user: dict
) -> BotUser:
    telegram_id = tg_user["id"]
    result = await db.execute(
        select(BotUser).where(
            BotUser.bot_id == uuid.UUID(bot_id),
            BotUser.telegram_id == telegram_id,
        )
    )
    user = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if not user:
        user = BotUser(
            bot_id=uuid.UUID(bot_id),
            telegram_id=telegram_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
            last_name=tg_user.get("last_name"),
            language_code=tg_user.get("language_code"),
            first_seen_at=now,
            last_seen_at=now,
        )
        db.add(user)
    else:
        user.last_seen_at = now
    await db.commit()
    return user
