#!/bin/sh
# Pegel – Datenbank-Backup (konsistenter Dump im laufenden Betrieb)
#
#   sh scripts/backup.sh            → backups/pegel-JJJJMMTT-HHMMSS.dump
#   KEEP=30 sh scripts/backup.sh    → die letzten 30 Sicherungen behalten (Standard: 14)
#
# Ausführen im Projektordner (dort, wo compose.yaml liegt), z. B. per Cron oder Synology-Aufgabenplaner:
#   cd /pfad/zu/pegel && sh scripts/backup.sh
set -eu

cd "$(dirname "$0")/.."
KEEP="${KEEP:-14}"
mkdir -p backups
chmod 700 backups

# Werte aus .env lesen (nur die benötigten Variablen)
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- | tr -d '"' || true)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- | tr -d '"' || true)
POSTGRES_USER="${POSTGRES_USER:-pegel}"
POSTGRES_DB="${POSTGRES_DB:-pegel}"

STAMP=$(date +%Y%m%d-%H%M%S)
FILE="backups/pegel-${STAMP}.dump"
TMP="${FILE}.part"

echo "Erstelle Backup ${FILE} …"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner > "$TMP"
mv "$TMP" "$FILE"
chmod 600 "$FILE"

# Prüfen, ob der Dump lesbar ist
docker compose exec -T db pg_restore --list < "$FILE" > /dev/null
echo "Backup OK ($(du -h "$FILE" | cut -f1))."

# Rotation
COUNT=$(ls -1 backups/pegel-*.dump 2>/dev/null | wc -l)
if [ "$COUNT" -gt "$KEEP" ]; then
  ls -1t backups/pegel-*.dump | tail -n +"$((KEEP + 1))" | while read -r old; do
    echo "Entferne altes Backup $old"
    rm -f "$old"
  done
fi
