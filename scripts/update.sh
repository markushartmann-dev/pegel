#!/bin/sh
# Pegel – Aktualisieren: Backup, neu bauen, Migrationen ausführen, neu starten.
#   cd /pfad/zu/pegel && sh scripts/update.sh
set -eu
cd "$(dirname "$0")/.."

if docker compose ps --status running db 2>/dev/null | grep -q db; then
  sh scripts/backup.sh
fi
docker compose build
# "migrate" läuft vor dem App-Start automatisch (depends_on: service_completed_successfully)
docker compose up -d --force-recreate --remove-orphans
docker image prune -f >/dev/null
docker compose ps
