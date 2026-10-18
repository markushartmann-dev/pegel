// Startet eine lokale, eingebettete PostgreSQL-Instanz für Entwicklung und Tests
// (kein Docker nötig). Daten liegen unter .data/pg-<name>.
// Aufruf: node scripts/dev-db.mjs [name] [port]
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const name = process.argv[2] ?? "dev";
const port = Number(process.argv[3] ?? 54329);
const databaseDir = path.resolve(".data", `pg-${name}`);
const fresh = !existsSync(path.join(databaseDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "pegel",
  password: "pegel",
  port,
  persistent: true,
  onLog: () => {},
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("pegel");
console.log(`PostgreSQL läuft: postgresql://pegel:pegel@localhost:${port}/pegel`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
