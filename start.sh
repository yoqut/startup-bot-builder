#!/usr/bin/env bash
# ============================================================
#  BotBuilder — to'liq ishga tushirish skripti
#  Ishlatish: ./start.sh
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT/.env"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

# ---- Ranglar -----------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()   { echo -e "${GREEN}[✔]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[!]${RESET} $*"; }
error() { echo -e "${RED}[✘]${RESET} $*" >&2; }
info()  { echo -e "${CYAN}[→]${RESET} $*"; }

BACKEND_PID=""
FRONTEND_PID=""
CELERY_PID=""

cleanup() {
    echo ""
    warn "To'xtatilmoqda..."
    [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null && info "Backend to'xtatildi"
    [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null && info "Frontend to'xtatildi"
    [[ -n "$CELERY_PID" ]]   && kill "$CELERY_PID"   2>/dev/null && info "Celery to'xtatildi"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "\n${BOLD}═══ BotBuilder Starter ═══${RESET}\n"

# ============================================================
# 0. DEPENDENCY TEKSHIRISH
# ============================================================
if command -v uv &>/dev/null; then
    PYTHON_RUN="uv run"
    log "Python runtime: uv"
elif command -v python3 &>/dev/null; then
    PYTHON_RUN="python3 -m"
    log "Python runtime: python3"
else
    error "uv yoki python3 topilmadi."
    exit 1
fi

# ============================================================
# 1. PORTLARNI TOZALASH
# ============================================================
for PORT in 8000 5173; do
    PIDS=$(lsof -ti ":$PORT" 2>/dev/null || true)
    if [[ -n "$PIDS" ]]; then
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
        info "Port $PORT bo'shatildi"
    fi
done

# ============================================================
# 2. POSTGRES + REDIS
# ============================================================
info "PostgreSQL va Redis tekshirilmoqda..."

# --- Redis ---
if nc -z localhost 6379 2>/dev/null; then
    log "Redis allaqachon ishlayapti"
else
    info "Redis ishga tushirilmoqda..."
    if command -v brew &>/dev/null && brew services list | grep -q "^redis"; then
        brew services start redis >> "$LOG_DIR/docker.log" 2>&1 || true
        sleep 2
    fi
    if nc -z localhost 6379 2>/dev/null; then
        log "Redis ishga tushdi"
    else
        warn "Redis ishga tushmadi — Celery ishlamasligi mumkin"
    fi
fi

# --- PostgreSQL ---
if nc -z localhost 5432 2>/dev/null; then
    log "PostgreSQL allaqachon ishlayapti"
else
    info "PostgreSQL ishga tushirilmoqda..."
    if docker info &>/dev/null 2>&1; then
        docker compose -f "$ROOT/docker/docker-compose.dev.yml" up -d db \
            >> "$LOG_DIR/docker.log" 2>&1 || true
    elif command -v brew &>/dev/null && brew services list | grep -q "postgresql@17"; then
        brew services start postgresql@17 >> "$LOG_DIR/docker.log" 2>&1 || true; sleep 3
    elif command -v brew &>/dev/null && brew services list | grep -q "postgresql@14"; then
        brew services start postgresql@14 >> "$LOG_DIR/docker.log" 2>&1 || true; sleep 3
    else
        error "PostgreSQL ishga tushirib bo'lmadi."
        exit 1
    fi

    for i in $(seq 1 20); do
        nc -z localhost 5432 2>/dev/null && break
        [[ $i -eq 20 ]] && { error "PostgreSQL 20s ichida ishga tushmadi"; exit 1; }
        sleep 1
    done
    log "PostgreSQL ishga tushdi"

    createuser -s botbuilder 2>/dev/null || true
    createdb -O botbuilder botbuilder 2>/dev/null || true
fi

# ============================================================
# 3. MIGRATSIYALAR
# ============================================================
info "Alembic migratsiyalari bajarilmoqda..."
cd "$BACKEND_DIR"
$PYTHON_RUN alembic upgrade head >> "$LOG_DIR/migrations.log" 2>&1
log "Migratsiyalar bajarildi"
cd "$ROOT"

# ============================================================
# 4. BACKEND (Uvicorn)
# ============================================================
info "Backend ishga tushirilmoqda (port 8000)..."
cd "$BACKEND_DIR"
$PYTHON_RUN uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
    > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

info "Backend tayyor bo'lishini kutmoqda..."
for i in $(seq 1 30); do
    if nc -z 127.0.0.1 8000 2>/dev/null; then
        log "Backend ishga tushdi (PID: $BACKEND_PID)"
        break
    fi
    [[ $i -eq 30 ]] && warn "Backend 30s ichida port ochilmadi. Log: $LOG_DIR/backend.log"
    sleep 1
done

# Barcha aktiv botlar webhookini yangi URL bilan qayta ulash
info "Botlar webhook qayta ulanmoqda..."
$PYTHON_RUN python - <<'PYEOF' 2>&1 | grep -v "warning\|VIRTUAL_ENV" || true
import asyncio, httpx
from app.db.session import get_db
from app.models.bot import Bot
from app.settings import settings
from app.utils.encryption import decrypt_token
from sqlalchemy import select

async def reregister():
    async for db in get_db():
        bots = (await db.execute(select(Bot).where(Bot.is_active == True))).scalars().all()
        if not bots:
            print("Aktiv bot topilmadi")
            break
        base = settings.WEBHOOK_BASE_URL
        async with httpx.AsyncClient(timeout=10) as client:
            for bot in bots:
                try:
                    token = decrypt_token(bot.token)
                    new_url = f"{base}/webhook/{token.split(':')[1]}"
                    resp = await client.post(
                        f"https://api.telegram.org/bot{token}/setWebhook",
                        json={
                            "url": new_url,
                            "allowed_updates": [
                                "message","edited_message","channel_post",
                                "callback_query","chat_join_request",
                                "business_connection","business_message",
                                "edited_business_message","deleted_business_messages",
                            ],
                            "drop_pending_updates": True,
                        }
                    )
                    data = resp.json()
                    if data.get("ok"):
                        bot.webhook_url = new_url
                        print(f"[✔] {bot.name}")
                    else:
                        print(f"[✘] {bot.name}: {data.get('description')}")
                except Exception as e:
                    print(f"[✘] {bot.name}: {e}")
        await db.commit()
        break

asyncio.run(reregister())
PYEOF
log "Webhook yangilash tugadi"

cd "$ROOT"

# ============================================================
# 5. CELERY WORKER
# ============================================================
if nc -z localhost 6379 2>/dev/null; then
    info "Celery worker ishga tushirilmoqda..."
    cd "$BACKEND_DIR"
    $PYTHON_RUN celery -A app.queue.worker worker -l info \
        > "$LOG_DIR/celery.log" 2>&1 &
    CELERY_PID=$!
    log "Celery ishga tushdi (PID: $CELERY_PID)"
    cd "$ROOT"
else
    warn "Redis yo'q — Celery o'tkazib yuborildi"
fi

# ============================================================
# 6. FRONTEND (Vite)
# ============================================================
info "Frontend ishga tushirilmoqda (port 5173)..."
cd "$FRONTEND_DIR"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
log "Frontend ishga tushdi (PID: $FRONTEND_PID)"
cd "$ROOT"

# ============================================================
# 7. STATUS
# ============================================================
WEBHOOK_BASE_URL=$(grep "^WEBHOOK_BASE_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || echo "")

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║         BotBuilder muvaffaqiyatli ishga tushdi   ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${CYAN}Frontend:${RESET}   http://localhost:5173"
echo -e "  ${CYAN}Backend:${RESET}    http://localhost:8000"
echo -e "  ${CYAN}API Docs:${RESET}   http://localhost:8000/schema/swagger"
[[ -n "$WEBHOOK_BASE_URL" ]] && echo -e "  ${CYAN}Webhook:${RESET}    ${BOLD}${WEBHOOK_BASE_URL}/webhook${RESET}"
echo ""
echo -e "  ${CYAN}Loglar:${RESET}  $LOG_DIR/"
echo -e "  ${YELLOW}To'xtatish: Ctrl+C${RESET}"
echo ""

# ============================================================
# 8. MONITORING
# ============================================================
while true; do
    sleep 5
    if [[ -n "$BACKEND_PID" ]] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        error "Backend to'xtab qoldi! Log: $LOG_DIR/backend.log"
        BACKEND_PID=""
    fi
    if [[ -n "$FRONTEND_PID" ]] && ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        warn "Frontend to'xtab qoldi. Log: $LOG_DIR/frontend.log"
        FRONTEND_PID=""
    fi
done
