#!/usr/bin/env bash
# Oxirgi muvaffaqiyatli commitga qaytish
# Ishlatish: bash scripts/rollback.sh
set -euo pipefail
APP_DIR="/opt/botbuilder"
cd "$APP_DIR"

echo "Oxirgi 5 commit:"
git log --oneline -5

read -rp "Qaysi commit ga qaytasiz? (hash): " COMMIT

git checkout "$COMMIT"
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d
echo "✅ Rollback: $COMMIT"
