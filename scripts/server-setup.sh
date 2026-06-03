#!/usr/bin/env bash
# =============================================================================
# BotBuilder — Server bir marta sozlash skripti
# Ubuntu 24.04 LTS uchun
# Ishlatish: bash server-setup.sh yoqutdigital.uz
# =============================================================================
set -euo pipefail

DOMAIN="${1:?'Domen nomi kerak: bash server-setup.sh yoqutdigital.uz'}"
APP_DIR="/opt/botbuilder"
GITHUB_REPO="https://github.com/yoqut/startup-bot-builder.git"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'
log()  { echo -e "${GREEN}[✔]${RESET} $*"; }
info() { echo -e "${CYAN}[→]${RESET} $*"; }
warn() { echo -e "${YELLOW}[!]${RESET} $*"; }

# ── Root tekshirish ───────────────────────────────────────────────────────────
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

# ── 4. SSH kalit sozlash (GitHub Actions uchun) ───────────────────────────────
info "Deploy kalit yaratilmoqda..."
SSH_KEY_FILE="/root/.ssh/deploy_key"
if [[ ! -f "$SSH_KEY_FILE" ]]; then
  ssh-keygen -t ed25519 -f "$SSH_KEY_FILE" -N "" -C "github-actions-deploy"
  log "SSH kalit yaratildi: $SSH_KEY_FILE"
  echo ""
  warn "Bu PUBLIC kalitni GitHub → Settings → Deploy keys ga qo'shing:"
  cat "${SSH_KEY_FILE}.pub"
  echo ""
  warn "Bu PRIVATE kalitni GitHub → Settings → Secrets → SERVER_SSH_KEY ga qo'shing:"
  cat "$SSH_KEY_FILE"
  echo ""
else
  log "SSH kalit allaqachon bor"
fi

# authorized_keys ga qo'shish
cat "${SSH_KEY_FILE}.pub" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# ── 5. Loyiha papkasi ─────────────────────────────────────────────────────────
info "Loyiha yuklanmoqda..."
if [[ ! -d "$APP_DIR" ]]; then
  git clone "$GITHUB_REPO" "$APP_DIR"
  log "Loyiha clone qilindi: $APP_DIR"
else
  log "Loyiha papkasi allaqachon bor: $APP_DIR"
fi

# ── 6. SSL sertifikat ─────────────────────────────────────────────────────────
info "Certbot o'rnatilmoqda..."
apt-get install -y -qq certbot
if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  info "SSL sertifikat olinmoqda (80-port vaqtincha ochiladi)..."
  certbot certonly --standalone --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" -d "$DOMAIN"
  log "SSL sertifikat olindi"
else
  log "SSL sertifikat allaqachon bor"
fi

# SSL avtomatik yangilash
echo "0 3 * * * certbot renew --quiet --deploy-hook 'docker compose -f $APP_DIR/docker/docker-compose.yml restart frontend'" \
  | crontab -
log "SSL avtomatik yangilash sozlandi"

# ── 7. nginx.prod.conf ga domain kiritish ────────────────────────────────────
info "Nginx config sozlanmoqda..."
sed -i "s/YOUR_DOMAIN.COM/$DOMAIN/g" "$APP_DIR/docker/nginx.prod.conf"
log "Nginx config tayyor"

# ── 8. .env fayl ─────────────────────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  warn ".env fayl yo'q! Yaratilmoqda..."
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"

  # Avtomatik kalitlar generatsiya qilish
  JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  ENC_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || \
            python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")
  BOT_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || \
            python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")
  DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(20))")

  sed -i \
    -e "s/STRONG_PASSWORD/$DB_PASS/g" \
    -e "s|GENERATE_64_CHAR_RANDOM_STRING_HERE|$JWT_SECRET|g" \
    -e "s|GENERATE_FERNET_KEY_HERE|$ENC_KEY|g" \
    -e "s|yoqutdigital.uz|$DOMAIN|g" \
    "$APP_DIR/.env"

  # BOT_TOKEN_ENCRYPTION_KEY alohida
  sed -i "0,/$ENC_KEY/! s/$ENC_KEY/$BOT_KEY/" "$APP_DIR/.env"

  chmod 600 "$APP_DIR/.env"
  warn "!!! .env fayl yaratildi. DATABASE_URL dagi parolni tekshiring: $APP_DIR/.env"
  warn "MANAGER_BOT_TOKEN va boshqa sozlamalarni qo'lda kiriting!"
else
  log ".env fayl allaqachon bor"
fi

# ── 9. Birinchi deploy ────────────────────────────────────────────────────────
info "Docker build va ishga tushirish..."
cd "$APP_DIR"
docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d
sleep 10
docker compose -f docker/docker-compose.yml exec -T backend uv run alembic upgrade head
log "Migratsiyalar bajarildi"

# ── Yakuniy status ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║        Server muvaffaqiyatli sozlandi!           ║${RESET}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Site:     https://$DOMAIN"
echo -e "  App dir:  $APP_DIR"
echo -e "  Logs:     docker compose -f $APP_DIR/docker/docker-compose.yml logs -f"
echo ""
echo -e "${YELLOW}Keyingi qadam — GitHub Secrets qo'shing:${RESET}"
echo -e "  SERVER_HOST = $(curl -s ifconfig.me)"
echo -e "  SERVER_USER = root"
echo -e "  SERVER_SSH_KEY = (yuqorida ko'rsatilgan private kalit)"
echo ""
