-- Korrektur verschobener Zeitstempel.
-- Bis zu dieser Version hat die App Zeitstempel ohne Offset an PostgreSQL übergeben. Lief der
-- Datenbankserver nicht in UTC (z. B. TZ=Europe/Berlin), wurden sie als lokale Zeit interpretiert
-- und um den Zeitzonenversatz verschoben gespeichert. Ab jetzt verbindet sich die App mit
-- TimeZone=UTC; hier werden die bestehenden Werte einmalig korrigiert.
-- Läuft der Server bereits in UTC, ist die Umrechnung wirkungslos.
DO $$
DECLARE
  tz text := current_setting('TimeZone');
  r record;
BEGIN
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND data_type = 'timestamp with time zone'
      AND table_name <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'UPDATE %I SET %I = (%I AT TIME ZONE %L) AT TIME ZONE ''UTC'' WHERE %I IS NOT NULL',
      r.table_name, r.column_name, r.column_name, tz, r.column_name
    );
  END LOOP;
END $$;
