# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TelegramBotBuilder** — a no-code visual Telegram bot builder. Users design flows on a React Flow canvas (nodes + edges), publish them, and the backend executes those flows when Telegram sends webhook updates.

## Development Commands

### Backend (Python/Litestar)
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start dev server (auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Rollback one migration
alembic downgrade -1

# Start Celery worker (for async broadcast tasks)
celery -A app.queue.worker worker -l info
```

### Frontend (React/Vite)
```bash
cd frontend

npm install
npm run dev        # dev server on :5173, proxies /api and /webhook to :8000
npm run build      # tsc + vite build
```

### Docker (full stack)
```bash
docker compose -f docker/docker-compose.yml up --build -d
docker compose -f docker/docker-compose.yml exec backend alembic upgrade head
```
`docker-compose.dev.yml` starts only PostgreSQL + Redis for local development.

### Webhook for local testing
Use Cloudflare Tunnel or ngrok to expose port 8000. Set the resulting URL in `.env` as `WEBHOOK_BASE_URL`, then register it with Telegram via the bots API (`setWebhook`).

## Environment Configuration

Single `.env` file at repo root is shared. Backend reads it via `backend/app/settings.py` (Pydantic `BaseSettings`). Key variables:

```
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=...
WEBHOOK_BASE_URL=https://<tunnel>.trycloudflare.com
ENCRYPTION_KEY=<32-char Fernet key>
BOT_TOKEN_ENCRYPTION_KEY=<32-char Fernet key>
CORS_ORIGINS=http://localhost:5173,https://<frontend-tunnel>
```

Bot tokens are stored **encrypted** in the DB using `BOT_TOKEN_ENCRYPTION_KEY`. Use `app/utils/encryption.py` (`encrypt_token` / `decrypt_token`) when reading/writing tokens.

## Architecture

### Backend structure

```
backend/app/
├── main.py              # Litestar app factory — registers all controllers
├── settings.py          # Pydantic settings from .env
├── api/v1/              # REST API modules (auth, bots, flows, analytics, broadcast, …)
│   └── dependencies.py  # get_current_user_id() — JWT auth helper used in controllers
├── models/              # SQLAlchemy ORM models (PostgreSQL, UUID PKs)
├── runtime/             # Flow execution engine
│   ├── engine.py        # execute_flow() — main entry point
│   ├── state.py         # Redis-backed user state (24h TTL)
│   └── nodes/           # One file per node type, all extend BaseNode
├── webhook/
│   ├── controller.py    # POST /webhook/{token} — finds bot, calls dispatcher
│   └── dispatcher.py    # Parses Telegram update, routes to correct handler/flow
├── db/
│   ├── base.py          # Base, UUIDMixin, TimeStampMixin
│   ├── session.py       # AsyncSession factory (get_db dependency)
│   └── migrations/      # Alembic versions
└── cache/redis.py       # Shared async Redis client
```

### Flow execution pipeline

1. **Telegram** → `POST /webhook/{token}` → `WebhookController`
2. `dispatcher.dispatch()` parses the update (`_parse_update` → normalized `{type, from, chat_id, text, …}`)
3. Routing order:
   - Inline callback (`callback_data` starts with `node:`) → jump to target node
   - `current_node_id` in Redis state → resume paused flow
   - Find matching `handler` node (by trigger type + conditions)
   - Fallback: legacy `command`/`start` node
4. `execute_flow()` in `engine.py`:
   - Loads **all** `FlowEdge` rows for the flow once → builds `edge_map[source_id]`
   - Walks nodes sequentially up to `MAX_HOPS = 20`
   - Each node returns `ExecutionResult(next_node_id, variables, wait_for_input, handle)`
   - If `wait_for_input=True` → saves state to Redis and stops
   - Trigger nodes (`handler`, `command`, `start`) clear `ctx.message_text` after executing

### Key data models

| Model | Notes |
|---|---|
| `Bot` | Stores encrypted token, `webhook_url`, `is_active` |
| `Flow` | Belongs to Bot; `is_published` flag; `version` counter |
| `FlowNode` | `type` enum (handler/message/button/input/condition/…), `config` JSONB |
| `FlowEdge` | `source_node_id`, `target_node_id`, `condition_key` (edge handle name, e.g. `btn_0`, `true`) |
| `BotUser` | Telegram user tracked per-bot (`first_seen_at`, `last_seen_at`) |
| `AnalyticEvent` | Per-event log for analytics dashboard |

Only the **published** flow is executed by the engine. `publish_flow()` unpublishes all other flows for that bot, then marks the target as published.

### Node config conventions

- `FlowNode.config` is a free-form JSONB dict. Each node type documents its own keys.
- Buttons are stored as `config.buttons: [{label, action, value}]` with `config.button_layout: 'inline' | 'reply'`.
- Edge handles for buttons are `btn_0`, `btn_1`, … matching array index.
- Variable interpolation: `{{variable_name}}` in message text, replaced by `BaseNode._render()`.
- `on_callback: 'edit' | 'send'` on MessageNode — whether clicking an inline button edits the original message or sends a new one (default `edit`).

### Frontend structure

```
frontend/src/
├── api/          # Axios clients (client.ts sets base URL /api/v1, JWT interceptor)
├── store/        # Zustand stores: auth.store.ts, bot.store.ts, flow.store.ts
├── pages/
│   ├── FlowBuilder/        # Main canvas — index.tsx, NodePanel.tsx (right panel config), Sidebar.tsx (node palette), PreviewPanel.tsx (Telegram simulator)
│   └── Analytics/          # Recharts dashboard
└── components/flow/nodes/  # CustomNode.tsx — all React Flow node visual components
```

### Flow builder data flow

- `flow.store.ts` (Zustand) holds `nodes` + `edges` from `@xyflow/react`
- `NodePanel.tsx` opens when a node is selected; calls `onUpdate(config)` to patch `node.data.config`
- Save (`PUT /api/v1/flows/{id}`) sends full node+edge list; backend rebuilds from scratch (delete all, re-insert with `id_map` to handle non-UUID React Flow IDs)
- Publish (`POST /api/v1/flows/{id}/publish`) marks the flow live for the webhook engine

### Auth

JWT Bearer tokens. `access_token` + `refresh_token` stored in `localStorage`. The Axios interceptor in `api/client.ts` auto-refreshes on 401. Backend dependency `get_current_user_id(request)` validates the JWT and returns the user UUID.

## Critical Implementation Details

- **UUID handling**: React Flow node IDs may be non-UUID strings (e.g. `"handler-1"`). The flow save service builds an `id_map` to assign real UUIDs. The engine always calls `uuid.UUID(node_id)` before DB queries.
- **Edge `condition_key`**: maps to `sourceHandle` in React Flow. For button nodes: `btn_0`, `btn_1`, …; for condition nodes: `true` / `false`; default fallback: `"default"`.
- **Reply keyboard routing**: When a user taps a reply keyboard button, the text is matched against button labels in the message/button node to follow the correct edge (`btn_i`).
- **Bot token lookup in webhook**: uses `.contains(token)` on `webhook_url` + `.limit(1)` to avoid `MultipleResultsFound` if duplicate bots exist.
- **Analytic events**: committed immediately after `_get_or_create_bot_user`; the dispatcher calls `db.commit()` before invoking `execute_flow`.
