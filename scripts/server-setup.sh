#!/usr/bin/env bash
# =============================================================================
# BotBuilder — Server bir marta sozlash skripti
# Ubuntu 24.04 LTS uchun
# Ishlatish: bash server-setup.sh yoqutdigital.uz
# =============================================================================
set -euo pipefail

DOMAIN="${1:?'Domen nomi kerak: bash server-setup.sh yoqutdigital.uz'}"
APP_DIR="/var/www/constructor"
GITHUB_REPO="https://github.com/yoqut/startup-bot-builder.git"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
log()  { echo -e "${GREEN}[✔]${RESET} $*"; }
info() { echo -e "${CYAN}[→]${RESET} $*"; }
warn() { echo -e "${YELLOW}[!]${RESET} $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Root sifatida ishlatish kerak: sudo bash server-setup.sh $DOMAIN"
  exit 1
fi

log "Server sozlash boshlandi: $DOMAIN"

# ── 1. Tizim yangilash ────────────────────────────────────────────────────────
info "Tizim yangilanmoqda..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw fail2ban
log "Tizim yangilandi"

# ── 2. Docker ─────────────────────────────────────────────────────────────────
info "Docker o'rnatilmoqda..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  log "Docker o'rnatildi"
else
  log "Docker allaqachon bor"
fi

# ── 3. Firewall ───────────────────────────────────────────────────────────────
info "Firewall sozlanmoqda..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "Firewall yoqildi (SSH, 80, 443)"

# ── 4. SSH kalit (GitHub Actions uchun) ──────────────────────────────────────
info "Deploy kalit tekshirilmoqda..."
SSH_KEY_FILE="/root/.ssh/deploy_key"
if [[ ! -f "$SSH_KEY_FILE" ]]; then
  ssh-keygen -t ed25519 -f "$SSH_KEY_FILE" -N "" -C "github-actions-deploy"
  log "SSH kalit yaratildi"
  echo ""
  warn "PUBLIC kalit (GitHub → Settings → Deploy keys ga qo'shing):"
  cat "${SSH_KEY_FILE}.pub"
  echo ""
  warn "PRIVATE kalit (GitHub → Secrets → SERVER_SSH_KEY ga qo'shing):"
  cat "$SSH_KEY_FILE"
  echo ""
else
  log "SSH kalit allaqachon bor"
fi
cat "${SSH_KEY_FILE}.pub" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# ── 5. Loyiha ─────────────────────────────────────────────────────────────────
info "Loyiha tekshirilmoqda..."
if [[ ! -d "$APP_DIR/.git" ]]; then
  rm -rf "$APP_DIR"
  git clone "$GITHUB_REPO" "$APP_DIR"
  log "Loyiha clone qilindi"
else
  cd "$APP_DIR" && git pull origin main
  log "Loyiha yangilandi"
fi

# ── 6. Docker fayllarini yaratish (git da bo'lmasa) ──────────────────────────
info "Docker config fayllar yaratilmoqda..."
mkdir -p "$APP_DIR/docker"

# Dockerfile.backend
cat > "$APP_DIR/docker/Dockerfile.backend" << 'DOCKERFILE'
FROM python:3.12-slim
WORKDIR /app
RUN pip install uv
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --frozen --no-dev 2>/dev/null || pip install -r requirements.txt
COPY backend/ .
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
DOCKERFILE

# Dockerfile.frontend
cat > "$APP_DIR/docker/Dockerfile.frontend" << 'DOCKERFILE'
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --quiet
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
DOCKERFILE

# docker-compose.yml
cat > "$APP_DIR/docker/docker-compose.yml" << COMPOSE
version: '3.9'

services:
  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    env_file: ../.env
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: \${DB_NAME:-botbuilder}
      POSTGRES_USER: \${DB_USER:-botbuilder}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-Botbuilder2026}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U botbuilder"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    env_file: ../.env
    restart: unless-stopped
    command: uv run celery -A app.queue.worker worker -l info --concurrency=2
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
COMPOSE

# nginx.prod.conf
cat > "$APP_DIR/docker/nginx.prod.conf" << NGINX
server {
    listen 80;
    server_name _;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    client_max_body_size 50M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    root /usr/share/nginx/html;
    index index.html;

    location ~* \.(js|css|png|jpg|ico|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass         http://backend:8000;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_read_timeout 60s;
        proxy_buffering    off;
    }

    location /webhook/ {
        proxy_pass         http://backend:8000;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_read_timeout 30s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

log "Docker config fayllar tayyor"

# ── 7. SSL sertifikat ─────────────────────────────────────────────────────────
info "Certbot o'rnatilmoqda..."
apt-get install -y -qq certbot
if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  certbot certonly --standalone --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" -d "$DOMAIN"
  log "SSL sertifikat olindi"
else
  log "SSL sertifikat allaqachon bor"
fi

echo "0 3 * * * certbot renew --quiet && docker compose -f $APP_DIR/docker/docker-compose.yml restart frontend" | crontab -
log "SSL avtomatik yangilash sozlandi"

# ── 8. .env fayl ─────────────────────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  warn ".env fayl yaratilmoqda..."

  JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  ENC_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
  BOT_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
  DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")

  cat > "$APP_DIR/.env" << EOF
DATABASE_URL=postgresql+asyncpg://botbuilder:${DB_PASS}@db:5432/botbuilder
DB_NAME=botbuilder
DB_USER=botbuilder
DB_PASSWORD=${DB_PASS}
REDIS_URL=redis://redis:6379/0
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE_MINUTES=1440
JWT_REFRESH_EXPIRE_DAYS=30
ENCRYPTION_KEY=${ENC_KEY}
BOT_TOKEN_ENCRYPTION_KEY=${BOT_KEY}
WEBHOOK_BASE_URL=https://${DOMAIN}
CORS_ORIGINS=https://${DOMAIN}
MANAGER_BOT_TOKEN=
MANAGER_BOT_USERNAME=
OPENAI_API_KEY=
DEBUG=false
EOF

  chmod 600 "$APP_DIR/.env"
  log ".env yaratildi"
  warn "MANAGER_BOT_TOKEN ni qo'lda kiriting: nano $APP_DIR/.env"
else
  log ".env fayl allaqachon bor"
fi

# ── 9. Deploy ─────────────────────────────────────────────────────────────────
info "Docker build va ishga tushirish..."
cd "$APP_DIR"
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
sleep 15
docker compose -f docker/docker-compose.yml exec -T backend uv run alembic upgrade head
log "Migratsiyalar bajarildi"

# ── Yakuniy ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║        Server muvaffaqiyatli sozlandi!           ║${RESET}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Site:    https://$DOMAIN"
echo -e "  Loglar:  docker compose -f $APP_DIR/docker/docker-compose.yml logs -f"
echo ""
echo -e "${YELLOW}GitHub Secrets (github.com → repo → Settings → Secrets):${RESET}"
echo -e "  SERVER_HOST = $(curl -s ifconfig.me 2>/dev/null || echo '159.203.188.230')"
echo -e "  SERVER_USER = root"
echo -e "  SERVER_SSH_KEY = /root/.ssh/deploy_key (private kalit)"
echo ""
