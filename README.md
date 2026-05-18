# TelegramBotBuilder

Telegram botlarini kod yozmasdan, vizual ravishda quradigan platforma.  
Node-based drag-and-drop flow tizimi orqali murakkab bot ssenariylarini yaratish mumkin.

---

## Imkoniyatlar

- **Vizual Flow Builder** — React Flow asosida drag-and-drop canvas
- **Node turlari** — Trigger, Xabar, Kiritish, Shart, Kutish, API Call, AI, O'zgaruvchi
- **Per-button ulanishlar** — har bir tugma o'z nodega ulanadi
- **Preview Panel** — publish qilmasdan oldin Telegram simulyatsiyasida sinab ko'rish
- **Ko'p bot** — bitta akkauntda cheksiz bot yaratish
- **O'zgaruvchilar** — `{{user_name}}` ko'rinishida template engine
- **Webhook** — Cloudflare Tunnel / nginx orqali real-time ishlaydi

---

## Texnologiyalar

### Backend
| | |
|---|---|
| Framework | Litestar (Python async) |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| DB | PostgreSQL 16 |
| Cache / State | Redis 7 |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt |
| Telegram | pyTelegramBotAPI |
| Task queue | Celery + Redis |
| Encryption | Fernet (cryptography) |

### Frontend
| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite + Tailwind CSS v4 |
| Flow canvas | @xyflow/react |
| State | Zustand |
| HTTP | Axios |
| Icons | Lucide React |
| Charts | Recharts |

---

## Tuzilma

```
botbuilder/
├── backend/
│   └── app/
│       ├── api/v1/          # REST controllers + services
│       │   ├── auth/
│       │   ├── bots/
│       │   └── flows/
│       ├── models/          # SQLAlchemy modellari
│       ├── runtime/
│       │   ├── engine.py    # Flow execution engine
│       │   └── nodes/       # Har bir node turi (message, condition, ai...)
│       ├── webhook/         # Telegram webhook handler
│       └── utils/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── FlowBuilder/ # Canvas, Sidebar, NodePanel, PreviewPanel
│       │   ├── Bots/
│       │   └── Dashboard/
│       ├── components/
│       │   └── flow/nodes/  # React Flow custom node komponentlari
│       ├── store/           # Zustand stores
│       └── api/             # Axios API wrappers
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile.*
├── nginx/
│   └── nginx.conf
└── .env
```

---

## Local ishga tushirish

### Talablar
- Python 3.11+
- Node.js 20+
- PostgreSQL 16
- Redis 7
- (ixtiyoriy) Docker & Docker Compose

### 1. Reponi clone qilish

```bash
git clone <repo-url>
cd botbuilder
```

### 2. Environment o'rnatish

```bash
cp .env.example .env
```

`.env` faylni tahrirlang:

```env
DATABASE_URL=postgresql+asyncpg://botbuilder:secret@localhost:5432/botbuilder
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=<kamida-32-ta-tasodifiy-belgi>
ENCRYPTION_KEY=<32-belgi>
BOT_TOKEN_ENCRYPTION_KEY=<32-belgi>
WEBHOOK_BASE_URL=https://your-public-domain.com
CORS_ORIGINS=http://localhost:5173
```

> **Webhook URL haqida:** Telegram faqat HTTPS URL'ga update yuboradi.  
> Local uchun [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) yoki [ngrok](https://ngrok.com) ishlatiladi:
> ```bash
> # Cloudflare
> cloudflared tunnel --url http://localhost:8000
> # yoki ngrok
> ngrok http 8000
> ```
> Keyin `WEBHOOK_BASE_URL` ni o'sha URL ga o'zgartiring.

### 3. PostgreSQL va Redis

```bash
# Docker orqali
docker run -d --name pg -e POSTGRES_DB=botbuilder -e POSTGRES_USER=botbuilder \
  -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:16-alpine

docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 4. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Migratsiya
alembic upgrade head

# Serverni ishga tushirish
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Brauzerda oching: **http://localhost:5173**

---

## Docker orqali ishga tushirish (to'liq)

```bash
# .env faylni tayyorlang (yuqoridagi kabi)
cp .env.example .env

# Barcha servislarni birga ishga tushirish
docker compose -f docker/docker-compose.yml up --build -d

# Migratsiya
docker compose -f docker/docker-compose.yml exec backend alembic upgrade head
```

| Servis | Port |
|--------|------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Demo foydalanuvchilar

| Email | Parol |
|-------|-------|
| `admin@botbuilder.uz` | `admin123` |
| `demo@botbuilder.uz` | `demo1234` |
| `test@botbuilder.uz` | `test1234` |

Demo foydalanuvchilarni yaratish:

```bash
cd backend
python scripts/create_demo_users.py
```

---

## Bot ulash va ishga tushirish

1. **@BotFather** dan bot yarating va tokenini oling
2. Saytga kiring → **Botlar** → **Bot qo'shish**
3. Bot nomini va tokenini kiriting
4. Bot kartasida **Yoqish** tugmasini bosing (webhook ro'yxatdan o'tadi)
5. **Flow** tugmasini bosib Flow Builder'ni oching
6. Nodelarni qo'shib ulang
7. **Nashr etish** — saqlaydi, publish qiladi, botni avtomatik aktivlashtiradi

---

## Node turlari

| Node | Vazifasi | Chiqish |
|------|----------|---------|
| `command` | `/start`, `/help` kabi commandlarni ushlaydi | 1 ta |
| `message` | Matn, rasm, video, audio, hujjat, so'rovnoma yuboradi. Tugmalar qo'shsa — har bir tugmadan alohida ulanish | N ta (tugma soniga qarab) |
| `input` | Foydalanuvchidan matn kutadi, `{{o'zgaruvchi}}`ga saqlaydi | 1 ta |
| `condition` | `{{o'zgaruvchi}}` qiymatini tekshiradi | 2 ta (True / False) |
| `delay` | N soniya kutadi, ixtiyoriy "typing…" ko'rsatadi | 1 ta |
| `set_variable` | `{{o'zgaruvchi}}` qiymatini o'rnatadi | 1 ta |
| `api_call` | HTTP so'rov yuboradi, javobni o'zgaruvchiga saqlaydi | 1 ta |
| `ai` | AI modeliga so'rov yuboradi, javobni o'zgaruvchiga saqlaydi | 1 ta |
| `end` | Flow'ni yakunlaydi | — |

---

## API hujjatlari

Backend ishga tushgandan keyin:

- **OpenAPI (Swagger):** http://localhost:8000/schema/swagger
- **Redoc:** http://localhost:8000/schema/redoc

---

## Asosiy API endpointlar

```
POST   /api/v1/auth/register          # Ro'yxatdan o'tish
POST   /api/v1/auth/login             # Kirish → JWT token

GET    /api/v1/bots                   # Botlar ro'yxati
POST   /api/v1/bots                   # Bot qo'shish
POST   /api/v1/bots/{id}/activate     # Webhook ro'yxatdan o'tkazish
POST   /api/v1/bots/{id}/deactivate   # Webhookni o'chirish
DELETE /api/v1/bots/{id}              # Botni o'chirish

GET    /api/v1/flows/bot/{bot_id}     # Flowlar ro'yxati
POST   /api/v1/flows/bot/{bot_id}     # Yangi flow yaratish
GET    /api/v1/flows/{id}             # Flow + nodelar + edgelar
PUT    /api/v1/flows/{id}             # Flow saqlash
POST   /api/v1/flows/{id}/publish     # Publish qilish

POST   /webhook/{token}               # Telegram webhook (ichki)
```

---

## Execution Engine

```
Telegram update keldi
    ↓
Webhook handler (dispatcher.py)
    ↓
Trigger node topildi (command / /start)
    ↓
Engine: edge map qurildi (barcha edgelar bir marta o'qiladi)
    ↓
Node ketma-ket bajariladi:
    message  → Telegram'ga xabar yuboradi
    input    → kutadi, javob kelsa o'zgaruvchiga yozadi
    condition → True/False edge'ga o'tadi
    delay    → asyncio.sleep
    api_call → httpx bilan HTTP so'rov
    ai       → LLM API chaqiruvi
    end      → to'xtaydi
    ↓
Holat Redis'ga saqlanadi (TTL 24 soat)
```

---

## Litsenziya

MIT
