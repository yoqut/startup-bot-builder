# BotBuilder Platform — Full Architecture

## Overview

Telegram'dagi eng kuchli no-code bot builder platform.
Modular Monolith — tez development, maintainable, microservice-ready.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Ecosystem                        │
│  User ──► Telegram App ──► Bot ──► Webhook ──► BotBuilder  │
└─────────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────▼────────────────┐
                    │          Nginx (Reverse Proxy)            │
                    │     TLS termination, Rate limiting        │
                    └──────────────┬────────────┬──────────────┘
                                   │            │
              ┌────────────────────▼──┐    ┌───▼──────────────────┐
              │   Litestar Backend    │    │   React Frontend      │
              │   Python 3.12+        │    │   Vite + TailwindCSS  │
              │   Async-first         │    │   React Flow          │
              │   WebSocket support   │    │   Zustand + TanStack  │
              └──────┬──────────┬────┘    └──────────────────────┘
                     │          │
         ┌───────────▼──┐  ┌───▼──────────────┐
         │  PostgreSQL  │  │      Redis         │
         │  SQLAlchemy  │  │  Cache + Pub/Sub  │
         │  Alembic     │  │  Rate limiting    │
         └──────────────┘  └───────────────────┘
```

---

## Module Structure

### Backend (src/)

```
src/
├── core/
│   ├── config/       # Pydantic-settings, environment-aware
│   ├── database/     # SQLAlchemy async engine, session management
│   ├── security/     # JWT, encryption, rate limiting middleware
│   ├── middleware/   # Request ID, security headers
│   └── events/       # Internal event bus
│
├── auth/             # Telegram WebApp auth, JWT lifecycle
├── bots/             # Bot registration, webhook management, token encryption
│
├── flows/
│   ├── engine/       # DAG executor — traverses node graph async
│   ├── nodes/        # All node handlers (triggers, messages, logic, AI, etc.)
│   └── models/       # Flow, Node, Edge, FlowVersion, FlowExecution
│
├── telegram/
│   ├── webhook/      # Webhook endpoint, signature verification
│   └── events/       # Update normalizer — Telegram → internal format
│
├── ai/
│   ├── flow_generator.py  # Natural language → flow graph
│   └── providers/         # OpenAI, Anthropic adapters
│
├── analytics/        # Time-series metrics, event tracking
├── templates/        # Pre-built flow templates
├── admin/            # Admin panel API
├── realtime/         # WebSocket handler, Redis broadcaster
└── notifications/    # Push notifications
```

---

## Flow Execution Engine

### How it works:

1. **Telegram Update** arrives at `/api/v1/webhook/{bot_id}`
2. **Signature verified** — X-Telegram-Bot-Api-Secret-Token header checked
3. **Normalizer** converts raw update → internal event format
4. **Flow Executor** finds matching trigger nodes across active flows
5. **DAG Traversal** — BFS from trigger node, executing each handler
6. **Variable Context** shared across all nodes in execution
7. **Execution Trace** recorded — each node step logged for debugger
8. **WebSocket Broadcast** — realtime updates pushed to connected clients

### Variable Interpolation

Nodes support template syntax:
- `{{user.first_name}}` — Telegram user fields
- `{{var.my_variable}}` — stored variables
- `{{event.text}}` — current event data

### DAG Execution Rules

- Max depth: 100 nodes (prevents infinite loops)
- Max time: 30 seconds (hard timeout)
- Conditional branches: `{branch: "true"}` / `{branch: "false"}` output
- Error handling: node failures logged, execution continues if non-critical

---

## Security Architecture

### Bot Token Protection
- Tokens encrypted with Fernet (AES-128-CBC + HMAC-SHA256)
- Encryption key stored in environment variable, never in DB
- Tokens never returned in API responses

### Authentication Flow
```
Telegram WebApp → initData → HMAC-SHA256 verify → JWT issue
JWT (60min) + Refresh Token (30 days, hashed in DB)
Refresh token rotation on each use
```

### Rate Limiting
- Per-IP: 60 req/min (sliding window, Redis)
- Per-user: 1000 req/hour
- Webhook endpoints excluded (Telegram needs unrestricted access)

---

## Realtime Architecture

```
Bot Execution ──► Redis Pub/Sub ──► WebSocket Handler ──► Browser
   channel: bot:{id}:execution
   channel: bot:{id}:analytics
   channel: bot:{id}:logs
```

Each WebSocket client subscribes to 3 channels per bot.
Multiple backend instances share state via Redis (horizontal scaling ready).

---

## Database Schema

### Key Design Decisions

1. **UUIDs as PKs** — no sequential ID exposure, safer for multi-tenant
2. **JSON columns for configs** — node configs vary per type, schema validated in application layer
3. **Soft deletes** — bots/flows/nodes never hard deleted, recoverable
4. **Execution traces as JSON** — flexible schema for visual debugger

### Tables
- `users` — Telegram identity, role, subscription
- `refresh_tokens` — hashed, rotatable JWT refresh tokens
- `audit_logs` — every significant action logged
- `bots` — encrypted tokens, webhook state
- `flows` — named DAGs per bot
- `nodes` — vertices with JSON config
- `edges` — directed connections between nodes
- `flow_versions` — immutable snapshots for rollback
- `flow_executions` — runtime records with traces
- `bot_users` — individual users interacting with bots
- `analytics_events` — custom event tracking
- `bot_analytics` — daily rollup metrics

---

## Frontend Architecture

### State Management
- **Zustand** — builder state (nodes, edges, undo/redo)
- **TanStack Query** — server state (bots, flows, analytics)
- **Persist middleware** — auth state in localStorage

### React Flow Customization
- Custom `CustomNode` component per node category
- Execution status visualization (active/done/error rings)
- Drag-from-sidebar → canvas drop
- Autosave with 2s debounce
- Keyboard shortcuts: Ctrl+Z, Ctrl+D, Delete, Escape

### WebSocket Integration
- Exponential backoff reconnection
- Dispatches node status to Zustand store
- Builder UI updates in realtime during test execution

---

## Scaling Strategy

### MVP (Single Server)
- SQLite → PostgreSQL migration via Alembic
- Single Uvicorn instance with 4 workers

### Growth (Multi-Instance)
- Redis for session sharing and pub/sub
- Sticky sessions not needed (JWT is stateless)
- Horizontal scaling: multiple Uvicorn instances behind Nginx

### Enterprise
- Separate execution workers (RQ or Celery)
- Read replicas for analytics queries
- Event bus: Redis Streams → Kafka/NATS when needed
- Per-bot execution isolation via containerization

---

## MVP Roadmap

### Week 1-2: Foundation
- [ ] Backend setup, DB schema, migrations
- [ ] Telegram auth flow
- [ ] Bot registration + webhook setup
- [ ] Basic flow CRUD API

### Week 3-4: Core Builder
- [ ] React Flow canvas
- [ ] Node sidebar + drag-and-drop
- [ ] Node config panels
- [ ] Autosave

### Week 5-6: Execution Engine
- [ ] Trigger/Message/Logic nodes
- [ ] Flow executor + DAG traversal
- [ ] Webhook handler
- [ ] Basic analytics

### Week 7-8: AI + Realtime
- [ ] AI nodes (reply, moderation, intent)
- [ ] AI flow generator
- [ ] WebSocket realtime updates
- [ ] Execution debugger

### Week 9-10: Polish + Launch
- [ ] Templates system
- [ ] Admin panel
- [ ] Performance optimization
- [ ] Production deployment

---

## Performance Considerations

1. **Async-first** — every I/O operation is async (DB, Redis, HTTP, Telegram)
2. **Connection pooling** — SQLAlchemy pool_size=10, max_overflow=20
3. **Redis caching** — bot configs cached, invalidated on update
4. **Lazy loading** — frontend code-split per route
5. **Virtualized lists** — large bot user lists use virtual scrolling
6. **Webhook response time** — always 200ms, execution runs in background task

---

## Telegram API Limitations & Solutions

| Limitation | Solution |
|-----------|----------|
| 30 msg/sec per bot | Queue with rate limiter |
| No reading messages from groups (without admin) | Document this clearly in UI |
| Webhook must be HTTPS | Nginx TLS termination |
| Bot can't see messages it didn't receive | Event-driven only, no polling |
| initData expires in 24h | Refresh-token pattern for longer sessions |
| No user phone/email access | Telegram ID as unique identifier |
| File size limits (20MB bots, 50MB direct) | Warn in media node config |
