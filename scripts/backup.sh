#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

read_env() {
	if [ ! -f .env ]; then
		return 0
	fi
	local value
	value="$(grep -E "^${1}=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true)"
	printf '%s' "$value"
}

DATABASE_PATH="${DATABASE_PATH:-$(read_env DATABASE_PATH)}"
UPLOAD_DIR="${UPLOAD_DIR:-$(read_env UPLOAD_DIR)}"
RETENTION_DAYS="${RETENTION_DAYS:-$(read_env RETENTION_DAYS)}"
DATABASE_PATH="${DATABASE_PATH:-./data/app.db}"
UPLOAD_DIR="${UPLOAD_DIR:-./storage/attachments}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ ! -f "$DATABASE_PATH" ]; then
	echo "Database not found: $DATABASE_PATH" >&2
	exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F-%H%M%S)"
DB_BACKUP="$BACKUP_DIR/app-$STAMP.db"
UPLOAD_BACKUP="$BACKUP_DIR/uploads-$STAMP.tar.gz"

sqlite3 "$DATABASE_PATH" ".backup '$DB_BACKUP'"

if [ -d "$UPLOAD_DIR" ]; then
	tar -czf "$UPLOAD_BACKUP" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
else
	echo "Upload directory not found; skipping attachments: $UPLOAD_DIR" >&2
fi

find "$BACKUP_DIR" -type f -name 'app-*.db' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'uploads-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Database backup: $DB_BACKUP"
if [ -f "$UPLOAD_BACKUP" ]; then
	echo "Uploads backup: $UPLOAD_BACKUP"
fi
