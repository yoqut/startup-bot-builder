# TelegramBotBuilder — Technical Specification

**Version:** 1.0 MVP  
**Date:** 2026-05-06  
**Stack:** LiteStar · pyTelegramBotAPI · React · react-flow · PostgreSQL · Redis

--

## 1. LOYIHA HAQIDA

TelegramBotBuilder — kod yozmasdan Telegram bot va Telegram Web App yaratish platformasi.  
Foydalanuvchi drag-and-drop flow builder orqali bot mantiqini tuzadi, platform webhookni auto-sozlaydi va botni ishga tushiradi.

### Asosiy Rol'lar

| Rol | Tavsif |
|---|---|
| `superadmin` | Barcha foydalanuvchilar, tariflar, botlar va platformani boshqaradi |
| `user` | O'z botlari va webapplarini yaratadi, tarif limiti doirasida |
| `bot_user` | Yaratilgan botlarni ishlatuvchi Telegram foydalanuvchisi |

---

## 2. TARIF REJALARI

| | Free | Pro | Business |
|---|---|---|---|
| **Narx** | 0 | To'lov | Premium |
| **Botlar soni** | 3 | 5 | 10 |
| **Web App soni** | 1 | 2 | 5 |
| **Bot foydalanuvchilar** | 500,000 | 1,000,000 | 100,000,000 |
| **Reklama** | Bor | Yo'q | Yo'q |
| **Ko'p til** | Yo'q | Bor | Bor |
| **Webhook/Conversion API** | Yo'q | Bor | Bor |
| **CRM ulash** | Yo'q | Yo'q | Bor |
| **1C/Bitrix integratsiya** | Yo'q | Yo'q | Bor |
| **AI node** | Yo'q | Bor | Bor |
| **Marketplace sotish** | Yo'q | Bor | Bor |

---

## 3. ARXITEKTURA

```
┌─────────────────────────────────────────────────────────┐
│                     INTERNET                            │
│                                                         │
│  Telegram API ──webhook──► LiteStar Backend             │
│  Browser      ──REST/WS──► LiteStar Backend             │
│  Telegram App ──Mini App──► React Frontend (CDN)        │
└─────────────────────────────────────────────────────────┘

LiteStar Backend:
  ├── /api/v1/          REST API (auth, bots, flows, analytics)
  ├── /webhook/{token}  Telegram webhook receiver
  ├── /ws/             WebSocket (live preview, builder sync)
  └── /app/            Static React build

Runtime Engine:
  └── Redis Queue → Worker (pyTelegramBotAPI) → Bot logic

DB:
  └── PostgreSQL (main data)
  └── Redis (session state, queue, cache)
```

### Komponentlar orasidagi munosabat

```
User → React Builder → REST API → PostgreSQL (flow saqlash)
                                → Redis (publish flow update)

Telegram User → Bot → Webhook → LiteStar → Redis (state get/set)
                                          → PostgreSQL (flow read)
                                          → pyTelegramBotAPI (xabar yuborish)
```

---

## 4. FAYL STRUKTURASI

```
botbuilder/
├── backend/
│   ├── app/
│   │   ├── main.py                   # LiteStar app entry
│   │   ├── settings.py               # Config, env vars
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth/
│   │   │   │   │   ├── controller.py      # /api/v1/auth/*
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   └── service.py
│   │   │   │   ├── bots/
│   │   │   │   │   ├── controller.py      # /api/v1/bots/*
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   └── service.py
│   │   │   │   ├── flows/
│   │   │   │   │   ├── controller.py      # /api/v1/flows/*
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   └── service.py
│   │   │   │   ├── webapps/
│   │   │   │   │   ├── controller.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   └── service.py
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── controller.py
│   │   │   │   │   └── service.py
│   │   │   │   ├── broadcast/
│   │   │   │   │   ├── controller.py
│   │   │   │   │   └── service.py
│   │   │   │   ├── marketplace/
│   │   │   │   │   ├── controller.py
│   │   │   │   │   ├── schemas.py
│   │   │   │   │   └── service.py
│   │   │   │   ├── templates/
│   │   │   │   │   ├── controller.py
│   │   │   │   │   └── service.py
│   │   │   │   └── superadmin/
│   │   │   │       ├── controller.py
│   │   │   │       └── service.py
│   │   │
│   │   ├── webhook/
│   │   │   ├── controller.py         # POST /webhook/{token}
│   │   │   └── dispatcher.py         # Update → node routing
│   │   │
│   │   ├── runtime/
│   │   │   ├── engine.py             # Flow execution engine
│   │   │   ├── state.py              # User state (Redis)
│   │   │   ├── nodes/
│   │   │   │   ├── base.py
│   │   │   │   ├── message.py        # Xabar yuborish node
│   │   │   │   ├── button.py         # Inline/reply button node
│   │   │   │   ├── input.py          # Foydalanuvchi kiritishi
│   │   │   │   ├── condition.py      # If/else node
│   │   │   │   ├── api_call.py       # Tashqi API node
│   │   │   │   ├── ai.py             # AI javob node
│   │   │   │   ├── media.py          # Rasm/video/fayl node
│   │   │   │   └── catalog.py        # Mahsulot katalogi node
│   │   │   └── router.py             # Command/callback router
│   │   │
│   │   ├── bot/
│   │   │   ├── manager.py            # Bot lifecycle (register/stop)
│   │   │   └── webhook_manager.py    # setWebhook / deleteWebhook
│   │   │
│   │   ├── models/
│   │   │   ├── user.py               # Platform foydalanuvchisi
│   │   │   ├── bot.py
│   │   │   ├── flow.py
│   │   │   ├── flow_node.py
│   │   │   ├── flow_edge.py
│   │   │   ├── bot_user.py           # Telegram foydalanuvchisi
│   │   │   ├── bot_user_state.py
│   │   │   ├── webapp.py
│   │   │   ├── broadcast.py
│   │   │   ├── analytic_event.py
│   │   │   ├── marketplace_listing.py
│   │   │   ├── template.py
│   │   │   └── subscription.py
│   │   │
│   │   ├── db/
│   │   │   ├── base.py               # SQLAlchemy base
│   │   │   ├── session.py
│   │   │   └── migrations/           # Alembic
│   │   │
│   │   ├── cache/
│   │   │   ├── redis.py
│   │   │   └── keys.py               # Redis key constants
│   │   │
│   │   ├── queue/
│   │   │   ├── worker.py             # Broadcast worker
│   │   │   └── tasks.py
│   │   │
│   │   └── utils/
│   │       ├── auth.py               # JWT helpers
│   │       ├── pagination.py
│   │       └── validators.py
│   │
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_bots.py
│   │   ├── test_flows.py
│   │   ├── test_runtime.py
│   │   └── test_webhook.py
│   │
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── api/                      # API client (axios)
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── bots.ts
│   │   │   ├── flows.ts
│   │   │   ├── webapps.ts
│   │   │   ├── analytics.ts
│   │   │   ├── broadcast.ts
│   │   │   └── marketplace.ts
│   │   │
│   │   ├── store/                    # Zustand stores
│   │   │   ├── auth.store.ts
│   │   │   ├── bot.store.ts
│   │   │   ├── flow.store.ts
│   │   │   └── ui.store.ts
│   │   │
│   │   ├── pages/
│   │   │   ├── Login/
│   │   │   │   └── index.tsx
│   │   │   ├── Dashboard/
│   │   │   │   └── index.tsx
│   │   │   ├── Bots/
│   │   │   │   ├── index.tsx          # Bot list
│   │   │   │   ├── NewBot.tsx
│   │   │   │   └── BotDetail.tsx
│   │   │   ├── FlowBuilder/
│   │   │   │   ├── index.tsx          # react-flow canvas
│   │   │   │   ├── Sidebar.tsx        # Node palette
│   │   │   │   ├── NodePanel.tsx      # Node edit panel (right)
│   │   │   │   └── PreviewModal.tsx   # Bot preview
│   │   │   ├── WebAppBuilder/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Canvas.tsx
│   │   │   ├── Analytics/
│   │   │   │   └── index.tsx
│   │   │   ├── Broadcast/
│   │   │   │   └── index.tsx
│   │   │   ├── Marketplace/
│   │   │   │   ├── index.tsx
│   │   │   │   └── ListingDetail.tsx
│   │   │   ├── Templates/
│   │   │   │   └── index.tsx
│   │   │   ├── Settings/
│   │   │   │   ├── index.tsx
│   │   │   │   └── Billing.tsx
│   │   │   └── Superadmin/
│   │   │       ├── index.tsx
│   │   │       ├── Users.tsx
│   │   │       ├── Bots.tsx
│   │   │       └── Plans.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Topbar.tsx
│   │   │   ├── flow/
│   │   │   │   ├── nodes/
│   │   │   │   │   ├── MessageNode.tsx
│   │   │   │   │   ├── ButtonNode.tsx
│   │   │   │   │   ├── InputNode.tsx
│   │   │   │   │   ├── ConditionNode.tsx
│   │   │   │   │   ├── ApiCallNode.tsx
│   │   │   │   │   ├── AiNode.tsx
│   │   │   │   │   ├── MediaNode.tsx
│   │   │   │   │   └── CatalogNode.tsx
│   │   │   │   ├── edges/
│   │   │   │   │   └── CustomEdge.tsx
│   │   │   │   └── controls/
│   │   │   │       ├── MiniMap.tsx
│   │   │   │       └── Toolbar.tsx
│   │   │   ├── webapp/
│   │   │   │   ├── elements/
│   │   │   │   │   ├── TextElement.tsx
│   │   │   │   │   ├── ButtonElement.tsx
│   │   │   │   │   ├── FormElement.tsx
│   │   │   │   │   ├── ImageElement.tsx
│   │   │   │   │   └── CardElement.tsx
│   │   │   │   └── DraggableElement.tsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   └── Tooltip.tsx
│   │   │   └── TelegramPreview/
│   │   │       └── index.tsx          # Bot preview (telefon mockup)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useFlow.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── usePlan.ts
│   │   │
│   │   ├── types/
│   │   │   ├── bot.ts
│   │   │   ├── flow.ts
│   │   │   ├── webapp.ts
│   │   │   └── user.ts
│   │   │
│   │   └── utils/
│   │       ├── flowValidator.ts
│   │       └── nodeHelpers.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── nginx/
│   └── nginx.conf
│
└── .env.example
```

---

## 5. MA'LUMOTLAR BAZASI SXEMASI (PostgreSQL)

### `users` — Platform foydalanuvchilari

```sql
id              UUID PRIMARY KEY
email           VARCHAR UNIQUE NOT NULL
password_hash   VARCHAR NOT NULL
full_name       VARCHAR
role            ENUM('superadmin', 'user') DEFAULT 'user'
plan_id         INTEGER REFERENCES plans(id)
plan_expires_at TIMESTAMP
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP
```

### `plans` — Tarif rejalari

```sql
id              SERIAL PRIMARY KEY
name            VARCHAR          -- 'free', 'pro', 'business'
price           DECIMAL(10,2)
max_bots        INTEGER
max_webapps     INTEGER
max_bot_users   BIGINT
has_ads         BOOLEAN
multi_lang      BOOLEAN
webhook_access  BOOLEAN
ai_nodes        BOOLEAN
marketplace     BOOLEAN
crm_access      BOOLEAN
erp_access      BOOLEAN
```

### `bots` — Telegram botlari

```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
name            VARCHAR NOT NULL
token           VARCHAR UNIQUE NOT NULL  -- Telegram Bot Token (encrypted)
username        VARCHAR                  -- @botusername
webhook_url     VARCHAR
is_active       BOOLEAN DEFAULT false
is_for_sale     BOOLEAN DEFAULT false
sale_price      DECIMAL(10,2)
created_at      TIMESTAMP DEFAULT NOW()
```

### `flows` — Bot flow versiyalari

```sql
id              UUID PRIMARY KEY
bot_id          UUID REFERENCES bots(id)
name            VARCHAR DEFAULT 'Main Flow'
is_published    BOOLEAN DEFAULT false
version         INTEGER DEFAULT 1
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP
```

### `flow_nodes` — Flow nodelari

```sql
id              UUID PRIMARY KEY
flow_id         UUID REFERENCES flows(id)
type            ENUM('start', 'message', 'button', 'input',
                     'condition', 'api_call', 'ai', 'media',
                     'catalog', 'end')
label           VARCHAR
position_x      FLOAT
position_y      FLOAT
config          JSONB           -- Node-specific settings
created_at      TIMESTAMP DEFAULT NOW()
```

#### `config` JSONB misollari:

**message node:**
```json
{
  "text": "Salom! Qanday yordam kerak?",
  "parse_mode": "HTML",
  "media_url": null,
  "media_type": null
}
```

**button node:**
```json
{
  "buttons": [
    {"label": "Mahsulotlar", "action": "flow", "target_node_id": "uuid"},
    {"label": "Aloqa", "action": "flow", "target_node_id": "uuid"},
    {"label": "Sayt", "action": "url", "url": "https://example.com"}
  ],
  "layout": "inline"
}
```

**input node:**
```json
{
  "prompt": "Ismingizni kiriting:",
  "variable_name": "user_name",
  "validation": "text",
  "error_message": "Iltimos matn kiriting"
}
```

**condition node:**
```json
{
  "variable": "user_name",
  "operator": "equals",
  "value": "admin",
  "true_node_id": "uuid",
  "false_node_id": "uuid"
}
```

**api_call node:**
```json
{
  "url": "https://api.example.com/data",
  "method": "POST",
  "headers": {"Authorization": "Bearer {{token}}"},
  "body": {"name": "{{user_name}}"},
  "response_variable": "api_result"
}
```

**ai node:**
```json
{
  "system_prompt": "Sen do'stona assistant sifatida javob ber",
  "model": "gpt-4o-mini",
  "api_key_ref": "openai_key",
  "response_variable": "ai_answer"
}
```

### `flow_edges` — Nodelar orasidagi bog'lanishlar

```sql
id              UUID PRIMARY KEY
flow_id         UUID REFERENCES flows(id)
source_node_id  UUID REFERENCES flow_nodes(id)
target_node_id  UUID REFERENCES flow_nodes(id)
label           VARCHAR          -- 'yes', 'no', 'button_1', etc.
condition_key   VARCHAR          -- button callback data
```

### `bot_users` — Botdan foydalanadigan Telegram userlar

```sql
id              UUID PRIMARY KEY
bot_id          UUID REFERENCES bots(id)
telegram_id     BIGINT NOT NULL
username        VARCHAR
first_name      VARCHAR
last_name       VARCHAR
language_code   VARCHAR(10)
tags            TEXT[]           -- segmentatsiya uchun
variables       JSONB            -- flow davomida yig'ilgan ma'lumotlar
first_seen_at   TIMESTAMP DEFAULT NOW()
last_seen_at    TIMESTAMP
UNIQUE(bot_id, telegram_id)
```

### `bot_user_states` — Foydalanuvchi hozirgi flow holati (Redis'da ham)

```sql
id              UUID PRIMARY KEY
bot_user_id     UUID REFERENCES bot_users(id)
current_node_id UUID REFERENCES flow_nodes(id)
context         JSONB            -- o'zgaruvchilar
updated_at      TIMESTAMP
```

### `webapps` — Telegram Web App'lar

```sql
id              UUID PRIMARY KEY
bot_id          UUID REFERENCES bots(id)
name            VARCHAR
slug            VARCHAR UNIQUE
layout          JSONB            -- drag-drop elementlar
is_published    BOOLEAN DEFAULT false
created_at      TIMESTAMP DEFAULT NOW()
```

### `broadcasts` — Hamma userlarga xabar

```sql
id              UUID PRIMARY KEY
bot_id          UUID REFERENCES bots(id)
message         TEXT
media_url       VARCHAR
media_type      VARCHAR
target_tags     TEXT[]           -- bo'sh = hamma
status          ENUM('draft','queued','running','done','failed')
sent_count      INTEGER DEFAULT 0
fail_count      INTEGER DEFAULT 0
scheduled_at    TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
```

### `analytic_events` — Analytics hodisalar

```sql
id              UUID PRIMARY KEY
bot_id          UUID REFERENCES bots(id)
bot_user_id     UUID REFERENCES bot_users(id)
event_type      ENUM('start','message','button_click','flow_complete','webapp_open')
node_id         UUID
metadata        JSONB
created_at      TIMESTAMP DEFAULT NOW()
```

### `marketplace_listings` — Bot/template marketplace

```sql
id              UUID PRIMARY KEY
seller_id       UUID REFERENCES users(id)
type            ENUM('bot', 'template')
title           VARCHAR
description     TEXT
preview_url     VARCHAR
price           DECIMAL(10,2)
category        VARCHAR
is_approved     BOOLEAN DEFAULT false
purchase_count  INTEGER DEFAULT 0
rating          FLOAT
created_at      TIMESTAMP DEFAULT NOW()
```

### `templates` — Tayyor template botlar

```sql
id              UUID PRIMARY KEY
listing_id      UUID REFERENCES marketplace_listings(id)
flow_data       JSONB            -- to'liq flow snapshot
webapp_data     JSONB
category        ENUM('ecommerce', 'restaurant', 'booking',
                     'lead_gen', 'support', 'custom')
is_system       BOOLEAN          -- platform tizimiy templatelar
```

---

## 6. BACKEND API (LiteStar)

### Texnologiyalar

```toml
[tool.poetry.dependencies]
python = "^3.12"
litestar = "^2.x"
litestar-jwt = "^2.x"
sqlalchemy = {extras = ["asyncio"], version = "^2.x"}
asyncpg = "^0.29"
alembic = "^1.x"
redis = {extras = ["asyncio"], version = "^5.x"}
pyTelegramBotAPI = "^4.x"    # telebot
httpx = "^0.27"
pydantic = "^2.x"
python-jose = "^3.x"         # JWT
passlib = "^1.x"             # bcrypt
celery = "^5.x"              # broadcast queue
pillow = "^10.x"
```

### API Endpointlar

#### Auth — `/api/v1/auth`

```
POST   /register          Email + parol bilan ro'yxat
POST   /login             JWT token olish
POST   /refresh           Token yangilash
POST   /logout            Token bekor qilish
GET    /me                Joriy user ma'lumotlari
PATCH  /me                Profil yangilash
```

#### Bots — `/api/v1/bots`

```
GET    /                  Foydalanuvchi botlari ro'yxati
POST   /                  Yangi bot qo'shish (token validate + webhook set)
GET    /{id}              Bot detail
PATCH  /{id}              Bot yangilash
DELETE /{id}              Bot o'chirish (webhook delete)
POST   /{id}/activate     Bot webhookni yoqish
POST   /{id}/deactivate   Bot webhookni o'chirish
GET    /{id}/stats        Bot statistikasi
```

#### Flows — `/api/v1/flows`

```
GET    /bot/{bot_id}      Bot flowlari ro'yxati
POST   /bot/{bot_id}      Yangi flow yaratish
GET    /{id}              Flow + nodes + edges (to'liq)
PUT    /{id}              Flow saqlash (nodes+edges bilan)
DELETE /{id}              Flow o'chirish
POST   /{id}/publish      Flowni aktiv qilish
POST   /{id}/duplicate    Nusxa olish
```

#### WebApps — `/api/v1/webapps`

```
GET    /bot/{bot_id}      WebApp ro'yxati
POST   /bot/{bot_id}      Yangi webapp
GET    /{id}              Webapp detail
PUT    /{id}              Webapp saqlash
DELETE /{id}              O'chirish
POST   /{id}/publish      Nashr etish
GET    /preview/{slug}    Public preview
```

#### Analytics — `/api/v1/analytics`

```
GET    /bot/{bot_id}/overview     Umumiy: users, messages, opens
GET    /bot/{bot_id}/users        Foydalanuvchilar o'sishi (grafik)
GET    /bot/{bot_id}/events       Hodisalar ro'yxati
GET    /bot/{bot_id}/funnel       Node bo'yicha konversiya (pro+)
```

#### Broadcast — `/api/v1/broadcast`

```
GET    /bot/{bot_id}      Broadcast ro'yxati
POST   /bot/{bot_id}      Yangi broadcast yaratish
GET    /{id}              Detail va status
POST   /{id}/send         Yuborishni boshlash
DELETE /{id}              O'chirish (draft holatda)
```

#### Bot Users — `/api/v1/bot-users`

```
GET    /bot/{bot_id}              Foydalanuvchilar ro'yxati + filter
GET    /bot/{bot_id}/{user_id}    Detail + variables
PATCH  /bot/{bot_id}/{user_id}    Tag qo'shish/olib tashlash
GET    /bot/{bot_id}/export       CSV export
```

#### Marketplace — `/api/v1/marketplace`

```
GET    /                  Listing ro'yxati (filter: category, type, price)
GET    /{id}              Listing detail
POST   /list              O'z botini/templateni sotishga qo'yish
POST   /{id}/purchase     Sotib olish
GET    /my/listings       O'z listinglarim
GET    /my/purchases      Sotib olganlarim
```

#### Templates — `/api/v1/templates`

```
GET    /                  Tayyor templatelar (system + marketplace)
GET    /{id}              Template detail
POST   /{id}/use          Template asosida bot yaratish
```

#### Superadmin — `/api/v1/admin`

```
GET    /users             Barcha userlar
PATCH  /users/{id}        User edit (plan, block)
GET    /bots              Barcha botlar
GET    /plans             Plan ro'yxati
PUT    /plans/{id}        Plan yangilash
GET    /marketplace       Approve queue
POST   /marketplace/{id}/approve
DELETE /marketplace/{id}/reject
GET    /stats             Platform umumiy statistika
```

#### Webhook — `/webhook/{token}`

```
POST   /webhook/{token}   Telegram update qabul qilish
```

---

## 7. RUNTIME ENGINE

Bot webhook update qabul qilganda quyidagi jarayon ishlaydi:

```
Telegram Update
    │
    ▼
WebhookController (LiteStar)
    │ token → bot_id
    ▼
Dispatcher
    │ update.type → (message / callback_query / ...)
    ▼
Router
    │ /start → START node
    │ /command → command node
    │ "text" → current_node ga mos input node
    │ callback_data → button edge
    ▼
Engine.execute(bot_user, current_node)
    │
    ├── MessageNode → send_message()
    ├── ButtonNode  → send_message(reply_markup=...)
    ├── InputNode   → wait for next message, save to variable
    ├── ConditionNode → evaluate → branch
    ├── ApiCallNode → httpx.post() → save response
    ├── AiNode      → openai API → send response
    └── CatalogNode → show products
    │
    ▼
State.save(bot_user_id, next_node_id)   ← Redis
Analytics.track(event)                  ← PostgreSQL async
```

### State management (Redis)

```
Key: state:{bot_id}:{telegram_user_id}
Value: JSON {
  "current_node_id": "uuid",
  "variables": {"user_name": "Ali", "phone": "+998901234567"},
  "context": {}
}
TTL: 24 soat (user harakatsiz bo'lsa reset)
```

---

## 8. FRONTEND (React)

### Texnologiyalar

```json
{
  "react": "^19",
  "react-flow": "^12",
  "zustand": "^5",
  "axios": "^1.x",
  "@dnd-kit/core": "^6",
  "tailwindcss": "^4",
  "shadcn/ui": "latest",
  "recharts": "^2",
  "react-router-dom": "^7",
  "react-hook-form": "^7",
  "zod": "^3",
  "@telegram-apps/sdk-react": "^2"
}
```

### Flow Builder — Asosiy sahifa

```
┌────────────────────────────────────────────────────────────────┐
│ [Toolbar: Save | Publish | Preview | Undo | Redo | Zoom]       │
├──────────┬─────────────────────────────────────┬───────────────┤
│          │                                     │               │
│  Node    │         react-flow Canvas           │  Node Edit    │
│ Palette  │                                     │    Panel      │
│          │  [Start] ──► [Message] ──► [Button] │               │
│ ○ Message│                               │     │ Selected node │
│ ○ Button │                          ┌────┘     │ properties:   │
│ ○ Input  │                    [Input node]      │  - Text edit  │
│ ○ Condition                         │          │  - Buttons    │
│ ○ API    │                    [Condition]       │  - Variables  │
│ ○ AI     │                   yes ↓   no ↓      │  - Styling    │
│ ○ Media  │             [Message] [Message]      │               │
│ ○ Catalog│                                     │               │
│          │                                     │               │
└──────────┴─────────────────────────────────────┴───────────────┘
```

### Node turlari va ularning sozlamalari

#### Message Node
- Matn (HTML/Markdown format)
- Media biriktirish (rasm, video, fayl)
- Parse mode tanlash

#### Button Node
- Inline yoki Reply keyboard
- Har bir button: matn + action (node, URL, phone, location)
- Drag-drop tartib o'zgartirish

#### Input Node
- Prompt matni
- Variable nomi (saqlanadi)
- Validatsiya turi (text, number, phone, email)
- Xato xabar

#### Condition Node
- Variable tanlash
- Operator (equals, contains, greater_than, etc.)
- True → branch, False → branch

#### Start Node (har bir bot uchun har xil)
- `/start` command handler
- Xush kelibsiz xabar
- Quick action tugmalar

### Preview Modal

Telefon ramkasi ichida real-vaqt preview:
- Hozirgi tanlangan nodeni ko'rsatadi
- Button bosganda keyingi nodega o'tadi (simulyatsiya)
- Barcha media ko'rsatiladi

### WebApp Builder

```
┌────────────────────────────────────────────────────────────────┐
│ [Save | Preview | Publish | Device: Mobile/Desktop]            │
├──────────┬──────────────────────────────┬──────────────────────┤
│ Elements │    Phone Preview Canvas      │   Element Properties  │
│          │                              │                       │
│ ▦ Text   │  ┌──────────────────────┐   │ Tanlangan element:    │
│ ▦ Button │  │  [Header: Asosiy]    │   │  - Font size          │
│ ▦ Image  │  │  [Product Card]      │   │  - Color              │
│ ▦ Form   │  │  ┌────┐  ┌────┐     │   │  - Padding/Margin     │
│ ▦ Card   │  │  │Img │  │Img │     │   │  - Action (link/flow) │
│ ▦ List   │  │  └────┘  └────┘     │   │  - Responsive         │
│ ▦ Map    │  │  [Buy Button]        │   │                       │
│           │  └──────────────────────┘   │                       │
└──────────┴──────────────────────────────┴──────────────────────┘
```

### Dashboard

```
┌──────────────────────────────────────────────────────┐
│  Mening Botlarim                         [+ Bot qo'sh]│
├──────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐              │
│ │ 🤖 ShopBot      │ │ 🤖 SupportBot   │              │
│ │ Active ●        │ │ Draft ○         │              │
│ │ Users: 1,240    │ │ Users: 0        │              │
│ │ Today: +12      │ │                 │              │
│ │ [Edit] [Stats]  │ │ [Edit] [Publish]│              │
│ └─────────────────┘ └─────────────────┘              │
│                                                      │
│ Tarif: Free — 2/3 bot, 1/1 webapp        [Upgrade]  │
└──────────────────────────────────────────────────────┘
```

---

## 9. TELEGRAM WEB APP INTEGRATSIYASI

```typescript
// @telegram-apps/sdk-react ishlatish
import { useLaunchParams, useMainButton } from '@telegram-apps/sdk-react';

// Bot webapp URL:
// https://yourdomain.com/app/{webapp_slug}?tgWebAppStartParam={data}

// Backend webhook:
// WebApp → fetch('/api/v1/webapp/{slug}/submit', {...})
// Backend → bot.send_message(user_id, "Ma'lumot qabul qilindi!")
```

### WebApp → Bot kommunikatsiya
1. WebApp form submit qiladi
2. Backend `initData` ni validate qiladi
3. Bot foydalanuvchiga xabar yuboradi
4. Flow davom etadi

---

## 10. ANALYTICS

### Free tarif
- Jami bot foydalanuvchilar soni
- Kunlik/haftalik/oylik o'sish grafigi
- Jami xabarlar soni
- Active users (oxirgi 7 kun)

### Pro tarif (qo'shimcha)
- Node bo'yicha konversiya (funnel)
- Button click heatmap
- Conversion API / Webhook (tashqi sistemalarga event yuborish)
- WebApp ochilish statistikasi

### Business tarif (qo'shimcha)
- User segment filter
- CRM ga ma'lumot export
- 1C/Bitrix integratsiya

---

## 11. MARKETPLACE

### Bot sotish jarayoni
1. Bot egasi `is_for_sale = true` qiladi, narx belgilaydi
2. Marketplace listingga qo'shiladi (admin approve kerak)
3. Xaridor sotib oladi → bot clone qilinadi (token o'chiriladi)
4. Xaridor o'z tokenini kiritadi → yangi bot aktivlanadi

### Template sotish
1. Yaratuvchi flowni template sifatida export qiladi
2. Narx va kategoriya belgilaydi
3. Admin approve qiladi
4. Xaridor sotib oladi → template asosida bot yaratadi

### Tizimiy templatelar (bepul)
- E-commerce bot (katalog, buyurtma)
- Restaurant bot (menu, zal bron)
- Booking bot (uchrashuv, vaqt)
- Lead generation bot (ism, tel, email)
- Support bot (FAQ, operator)
- Survey bot (so'rovnoma)

---

## 12. BROADCAST

```
POST /api/v1/broadcast/bot/{bot_id}
{
  "message": "Yangi mahsulot keldi! 🎉",
  "media_url": "https://...",
  "target_tags": ["active_users"],  // [] = hamma
  "scheduled_at": null              // null = hozir
}
```

Worker jarayoni:
1. Bot userlarni batch (100 ta) qilib olib
2. Har biriga `send_message()` yuborish
3. 30ms delay (Telegram rate limit)
4. Success/fail sanash
5. Broadcast statusni yangilash

---

## 13. DEPLOY

### Docker Compose (Development)

```yaml
version: '3.9'
services:
  backend:
    build: ./docker/Dockerfile.backend
    env_file: .env
    ports: ["8000:8000"]
    depends_on: [db, redis]

  frontend:
    build: ./docker/Dockerfile.frontend
    ports: ["3000:3000"]

  db:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: botbuilder
      POSTGRES_USER: botbuilder
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine

  worker:
    build: ./docker/Dockerfile.backend
    command: celery -A app.queue.worker worker -l info
    depends_on: [db, redis]

volumes:
  postgres_data:
```

### Environment Variables

```env
# Backend
DATABASE_URL=postgresql+asyncpg://botbuilder:secret@db:5432/botbuilder
REDIS_URL=redis://redis:6379/0
JWT_SECRET=your-secret-key-here
JWT_EXPIRE_MINUTES=1440
WEBHOOK_BASE_URL=https://yourdomain.com
ENCRYPTION_KEY=32-char-key-for-token-encrypt

# Bot secrets encryption (AES-256)
BOT_TOKEN_ENCRYPTION_KEY=...

# Optional (pro features)
OPENAI_API_KEY=...
```

---

## 14. XAVFSIZLIK

| Muammo | Yechim |
|---|---|
| Bot token storage | AES-256 encrypted PostgreSQL'da |
| API auth | JWT (access 24h, refresh 30d) |
| Webhook spam | Token-based URL, rate limit |
| Telegram initData | HMAC-SHA256 validate (webapp) |
| SQL injection | SQLAlchemy ORM (parameterized) |
| XSS | React (auto-escape) + CSP headers |
| CORS | LiteStar CORS middleware (whitelist) |
| Rate limit | Redis-based rate limiter per user |

---

## 15. MVP BOSQICH REJASI

### Bosqich 1 — Yadro (3-4 hafta)
- [ ] LiteStar loyiha skeleti
- [ ] Auth (register, login, JWT)
- [ ] Bot CRUD + webhook auto-register
- [ ] Flow CRUD (nodes + edges)
- [ ] Runtime engine (message, button, input nodes)
- [ ] Redis state management
- [ ] React loyiha skeleti + routing
- [ ] Flow builder canvas (react-flow)
- [ ] Dashboard + bot list
- [ ] Bot preview modal

### Bosqich 2 — Yakunlash (2-3 hafta)
- [ ] Condition, API Call, AI nodes
- [ ] WebApp builder (basic)
- [ ] Analytics (overview)
- [ ] Broadcast (basic)
- [ ] Tarif tizimi
- [ ] Superadmin panel

### Bosqich 3 — O'sish (4-5 hafta)
- [ ] Marketplace
- [ ] Template system
- [ ] Bot/template sotish
- [ ] CRM integratsiya
- [ ] Conversion API/Webhook
- [ ] AI bot builder (prompt → flow)
- [ ] Multi-language

---

## 16. TEXNIK QARORLAR VA SABABLAR

| Qaror | Sabab |
|---|---|
| LiteStar | FastAPI'dan tezroq, built-in DI, OpenAPI, WebSocket |
| pyTelegramBotAPI | Eng yaxshi Python Telegram kutubxonasi, webhook support |
| react-flow | Production-ready drag-drop graph library |
| Redis state | DB ga har update yozish o'rniga, tez read/write |
| SQLAlchemy async | Async I/O + type-safe ORM |
| Celery broadcast | Rate-limit boshqarish, retry logic |
| AES token encrypt | Bot tokenlar DB'da ochiq saqlanmasin |
| Zustand | Redux'dan sodda, React'ga mos |

---

**Hujjat yakunlandi. Keyingi qadam: bosqich 1 implementatsiyasini boshlash.**
