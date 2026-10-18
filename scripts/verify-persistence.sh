#!/bin/sh
# Pegel – Prüft, ob Daten einen Neustart der Container überstehen (E2E-Szenario 10).
#
#   sh scripts/verify-persistence.sh
#
# Legt eine Markierung in der Datenbank an, startet alle Container neu (down/up)
# und prüft anschließend, ob die Markierung und die Anwendung wieder erreichbar sind.
set -eu
cd "$(dirname "$0")/.."

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- | tr -d '"' || true); POSTGRES_USER="${POSTGRES_USER:-pegel}"
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- | tr -d '"' || true); POSTGRES_DB="${POSTGRES_DB:-pegel}"
APP_PORT=$(grep -E '^APP_PORT=' .env | cut -d= -f2- | tr -d '"' || true); APP_PORT="${APP_PORT:-1717}"
MARK="persistenz-$(date +%s)"

psql() { docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "$1"; }

echo "1/4 Markierung schreiben: $MARK"
psql "INSERT INTO verification (id, identifier, value, \"expiresAt\", \"createdAt\", \"updatedAt\") VALUES ('$MARK', 'persistenz-test', '$MARK', now() + interval '1 hour', now(), now());" >/dev/null
BEFORE_USERS=$(psql 'SELECT count(*) FROM "user";')

echo "2/4 Container stoppen und neu starten …"
docker compose down
docker compose up -d

echo "3/4 Warten auf Healthcheck …"
i=0
until wget -qO- "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1; do
  i=$((i + 1)); [ $i -gt 60 ] && { echo "App nicht erreichbar"; exit 1; }
  sleep 2
done

echo "4/4 Prüfen …"
FOUND=$(psql "SELECT count(*) FROM verification WHERE id = '$MARK';")
AFTER_USERS=$(psql 'SELECT count(*) FROM "user";')
psql "DELETE FROM verification WHERE id = '$MARK';" >/dev/null
if [ "$FOUND" = "1" ] && [ "$BEFORE_USERS" = "$AFTER_USERS" ]; then
  echo "OK: Daten sind nach dem Neustart erhalten ($AFTER_USERS Benutzer)."
else
  echo "FEHLER: Markierung=$FOUND, Benutzer vorher=$BEFORE_USERS nachher=$AFTER_USERS"; exit 1
fi
