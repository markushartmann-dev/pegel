import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma-Client als Singleton (verhindert mehrere Pools bei Hot Reload).
 * Alle Abfragen laufen parametrisiert über Prisma – keine String-Verkettung von SQL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Beim `next build` (z. B. im Docker-Builder) gibt es keine Datenbank; die Verbindung
  // wird erst bei der ersten Abfrage aufgebaut, daher genügt dort ein Platzhalter.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const connectionString = process.env.DATABASE_URL ?? (isBuild ? "postgresql://build:build@127.0.0.1:1/build" : undefined);
  if (!connectionString) throw new Error("DATABASE_URL ist nicht gesetzt.");
  // Sitzungszeitzone UTC erzwingen: Der Prisma-Treiberadapter überträgt Zeitstempel ohne Offset und
  // liest sie als UTC. Läuft PostgreSQL mit einer anderen Zeitzone (z. B. TZ=Europe/Berlin im Container),
  // würden sonst alle Zeitpunkte verschoben gespeichert.
  const adapter = new PrismaPg({ connectionString, max: 10, options: "-c TimeZone=UTC" });
  return new PrismaClient({ adapter, log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["error"] });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type { Prisma } from "@/generated/prisma/client";
