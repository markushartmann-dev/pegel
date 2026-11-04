-- Zeitzone folgt standardmäßig dem Gerät; abschaltbar in den Einstellungen.
ALTER TABLE "user" ADD COLUMN "timezoneAuto" BOOLEAN NOT NULL DEFAULT true;
