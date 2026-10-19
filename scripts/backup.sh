#!/usr/bin/env bash
# Backs up the database, the WhatsApp sessions and the received media.
# Run from the repository root on the Docker host, e.g. daily via cron:
#   15 3 * * * cd /opt/whaticket && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="${BACKUP_DIR}/${STAMP}"

mkdir -p "${TARGET}"
echo "[backup] ${STAMP}: starting"

# Database dump, taken inside the container so no password goes through the host shell.
docker compose exec -T mysql sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  | gzip > "${TARGET}/database.sql.gz"

# WhatsApp sessions: without them every number has to scan the QR code again.
tar -czf "${TARGET}/sessions.tar.gz" \
  --ignore-failed-read \
  backend/.wwebjs_auth backend/.zapo_auth 2>/dev/null || true

# Media received and sent through the tickets.
tar -czf "${TARGET}/media.tar.gz" backend/public

echo "[backup] files in ${TARGET}:"
ls -lh "${TARGET}"

# Remove backups older than the retention window.
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime "+${BACKUP_RETENTION_DAYS}" -exec rm -rf {} +

echo "[backup] done"
