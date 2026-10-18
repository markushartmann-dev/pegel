// Startet für die E2E-Tests eine frische PostgreSQL-Instanz (eingebettet), spielt Migrationen
// und Seed ein und startet anschließend den Produktionsserver (vorher `npm run build`).
import EmbeddedPostgres from "embedded-postgres";
import { execSync, spawn } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const PG_PORT = 54332;
const APP_PORT = Number(process.env.E2E_PORT ?? 3100);
// Eigener Ordner pro Lauf; alte Ordner werden – soweit nicht mehr gesperrt – entfernt.
for (const old of readdirSync(".data").filter((n) => n.startsWith("pg-e2e"))) {
  try {
    rmSync(path.resolve(".data", old), { recursive: true, force: true });
  } catch {
    /* noch gesperrt (Windows) – beim nächsten Lauf erneut versuchen */
  }
}
const dir = path.resolve(".data", `pg-e2e-${Date.now()}`);

const pg = new EmbeddedPostgres({ databaseDir: dir, user: "pegel", password: "pegel", port: PG_PORT, persistent: false, onLog: () => {} });
await pg.initialise();
await pg.start();
await pg.createDatabase("pegel_e2e");

const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: `postgresql://pegel:pegel@localhost:${PG_PORT}/pegel_e2e`,
  AUTH_SECRET: "e2e-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
  APP_URL: `http://localhost:${APP_PORT}`,
  COOKIE_SECURE: "false",
  SCHEDULER_ENABLED: "false",
  DISABLE_AUTH_RATE_LIMIT: "true",
  REGISTRATION_ENABLED: "true",
};
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });

// Wie im Docker-Image: Standalone-Server mit statischen Dateien
if (!existsSync(".next/standalone/server.js")) throw new Error("Bitte zuerst npm run build ausführen.");
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
cpSync("public", ".next/standalone/public", { recursive: true });
const app = spawn(process.execPath, ["server.js"], {
  cwd: ".next/standalone",
  stdio: "inherit",
  env: { ...env, PORT: String(APP_PORT), HOSTNAME: "127.0.0.1" },
});

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  app.kill();
  await pg.stop().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
app.on("exit", stop);
