/**
 * Startet für die Integrationstests eine frische, eingebettete PostgreSQL-Instanz,
 * spielt alle Migrationen ein und legt die Standardgetränke an.
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const PORT = 54331;
const DIR = path.resolve(".data", "pg-integration");
export const TEST_DATABASE_URL = `postgresql://pegel:pegel@localhost:${PORT}/pegel_test`;

export default async function setup() {
  rmSync(DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({ databaseDir: DIR, user: "pegel", password: "pegel", port: PORT, persistent: false, onLog: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("pegel_test");
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL } });
  execSync("npx prisma db seed", { stdio: "pipe", env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL } });
  return async () => {
    await pg.stop();
    rmSync(DIR, { recursive: true, force: true });
  };
}
