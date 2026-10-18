#!/bin/sh
# Pegel – Wiederherstellung aus einem Backup
#
#   sh scripts/restore.sh backups/pegel-20261018-030000.dump
#
# ACHTUNG: Ersetzt den aktuellen Datenbankinhalt vollständig durch den Stand des Backups.
set -eu

cd "$(dirname "$0")/.."
FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Aufruf: sh scripts/restore.sh <backup-datei.dump>"
  echo "Vorhandene Backups:"; ls -1t backups/*.dump 2>/dev/null || echo "  (keine)"
  exit 1
fi

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- | tr -d '"' || true)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- | tr -d '"' || true)
POSTGRES_USER="${POSTGRES_USER:-pegel}"
POSTGRES_DB="${POSTGRES_DB:-pegel}"

printf "Datenbank '%s' wird durch %s ersetzt. Fortfahren? [ja/NEIN] " "$POSTGRES_DB" "$FILE"
read -r answer
[ "$answer" = "ja" ] || { echo "Abgebrochen."; exit 1; }

echo "Sicherheitskopie des aktuellen Stands …"
sh scripts/backup.sh

echo "Stoppe App …"
docker compose stop app

echo "Spiele Backup ein …"
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction < "$FILE"

echo "Starte App (Migrationen laufen automatisch) …"
docker compose up -d
echo "Wiederherstellung abgeschlossen."
