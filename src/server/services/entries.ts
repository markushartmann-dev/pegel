import "server-only";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, notFound } from "../errors";
import { roundGrams, totalAlcoholGrams } from "@/lib/calculations/alcohol";
import { canUseBeverage } from "@/lib/permissions";
import { entryInputSchema, entryUpdateSchema, historyQuerySchema } from "@/lib/validation";
import { dayKey, parseLocalDateTime, startOfDay, addDays } from "@/lib/dates";
import type { CurrentUser } from "../current-user";
import { Prisma } from "@/generated/prisma/client";

/** Einträge dürfen höchstens so weit in der Zukunft liegen (Uhrzeitabweichungen zwischen Geräten). */
const MAX_FUTURE_MS = 10 * 60_000;
const MAX_PAST_YEARS = 10;

export interface EntryDTO {
  id: string;
  beverageId: string | null;
  beverageName: string;
  category: string;
  abv: number;
  volumeMl: number;
  servings: number;
  alcoholGrams: number;
  consumedAt: string;
  timezone: string;
  note: string | null;
  day: string;
}

type EntryRow = Prisma.ConsumptionEntryGetPayload<object>;

export function toEntryDTO(e: EntryRow, tz: string): EntryDTO {
  return {
    id: e.id,
    beverageId: e.beverageId,
    beverageName: e.beverageName,
    category: e.category,
    abv: Number(e.abv),
    volumeMl: e.volumeMl,
    servings: e.servings,
    alcoholGrams: Number(e.alcoholGrams),
    consumedAt: e.consumedAt.toISOString(),
    timezone: e.timezone,
    note: e.note,
    day: dayKey(e.consumedAt, tz),
  };
}

function resolveTime(local: string, tz: string): Date {
  const d = parseLocalDateTime(local, tz);
  if (!d) throw badRequest("Ungültiger Zeitpunkt.", { consumedAtLocal: "Ungültiger Zeitpunkt." });
  if (d.getTime() > Date.now() + MAX_FUTURE_MS) {
    throw badRequest("Der Zeitpunkt liegt in der Zukunft.", { consumedAtLocal: "Der Zeitpunkt liegt in der Zukunft." });
  }
  const min = new Date();
  min.setFullYear(min.getFullYear() - MAX_PAST_YEARS);
  if (d < min) throw badRequest("Der Zeitpunkt liegt zu weit in der Vergangenheit.", { consumedAtLocal: "Zu weit in der Vergangenheit." });
  return d;
}

export async function createEntry(user: CurrentUser, raw: unknown, headers?: Headers) {
  const input = entryInputSchema.parse(raw);

  // Idempotenz: Wurde dieselbe Anfrage bereits verarbeitet, das bestehende Ergebnis liefern.
  if (input.clientRequestId) {
    const existing = await prisma.consumptionEntry.findUnique({
      where: { userId_clientRequestId: { userId: user.id, clientRequestId: input.clientRequestId } },
    });
    if (existing) return { entry: toEntryDTO(existing, user.timezone), duplicate: true };
  }

  const beverage = await prisma.beverage.findUnique({ where: { id: input.beverageId } });
  if (!beverage || !canUseBeverage(user, beverage)) throw notFound("Getränk nicht gefunden.");
  if (!beverage.isActive) throw badRequest("Dieses Getränk ist archiviert.");

  const volumeMl = input.volumeMl ?? beverage.volumeMl;
  const abv = input.abv ?? Number(beverage.abv);
  const consumedAt = resolveTime(input.consumedAtLocal, input.timezone);
  const grams = roundGrams(totalAlcoholGrams(volumeMl, abv, input.servings));

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const e = await tx.consumptionEntry.create({
        data: {
          userId: user.id,
          beverageId: beverage.id,
          beverageName: beverage.name,
          category: beverage.category,
          abv,
          volumeMl,
          servings: input.servings,
          alcoholGrams: grams,
          consumedAt,
          timezone: input.timezone,
          note: input.note || null,
          clientRequestId: input.clientRequestId ?? null,
        },
      });
      await audit({ action: "entry.created", actorId: user.id, entityType: "entry", entityId: e.id, headers }, tx);
      return e;
    });
    return { entry: toEntryDTO(entry, user.timezone), duplicate: false };
  } catch (e) {
    // Gleichzeitig doppelt abgeschickt → der andere Request hat gewonnen
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && input.clientRequestId) {
      const existing = await prisma.consumptionEntry.findUniqueOrThrow({
        where: { userId_clientRequestId: { userId: user.id, clientRequestId: input.clientRequestId } },
      });
      return { entry: toEntryDTO(existing, user.timezone), duplicate: true };
    }
    throw e;
  }
}

async function loadOwn(user: CurrentUser, id: string) {
  const e = await prisma.consumptionEntry.findUnique({ where: { id } });
  // Fremde Einträge werden wie nicht existierende behandelt (Schutz vor IDOR, kein Informationsleck)
  if (!e || e.userId !== user.id) throw notFound("Eintrag nicht gefunden.");
  return e;
}

export async function getEntry(user: CurrentUser, id: string) {
  return toEntryDTO(await loadOwn(user, id), user.timezone);
}

export async function updateEntry(user: CurrentUser, id: string, raw: unknown, headers?: Headers) {
  const input = entryUpdateSchema.parse(raw);
  const e = await loadOwn(user, id);
  const volumeMl = input.volumeMl ?? e.volumeMl;
  const abv = input.abv ?? Number(e.abv);
  const servings = input.servings ?? e.servings;
  const consumedAt = input.consumedAtLocal
    ? resolveTime(input.consumedAtLocal, input.timezone ?? e.timezone)
    : e.consumedAt;
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.consumptionEntry.update({
      where: { id },
      data: {
        volumeMl,
        abv,
        servings,
        alcoholGrams: roundGrams(totalAlcoholGrams(volumeMl, abv, servings)),
        consumedAt,
        timezone: input.timezone ?? e.timezone,
        note: input.note === undefined ? undefined : input.note || null,
      },
    });
    await audit({ action: "entry.updated", actorId: user.id, entityType: "entry", entityId: id, headers, metadata: { fields: Object.keys(input) } }, tx);
    return u;
  });
  return toEntryDTO(updated, user.timezone);
}

export async function deleteEntry(user: CurrentUser, id: string, headers?: Headers) {
  await loadOwn(user, id);
  await prisma.$transaction(async (tx) => {
    await tx.consumptionEntry.delete({ where: { id } });
    await audit({ action: "entry.deleted", actorId: user.id, entityType: "entry", entityId: id, headers }, tx);
  });
}

export async function recentEntries(user: CurrentUser, take = 5) {
  const rows = await prisma.consumptionEntry.findMany({
    where: { userId: user.id },
    orderBy: { consumedAt: "desc" },
    take,
  });
  return rows.map((r) => toEntryDTO(r, user.timezone));
}

export async function entriesBetween(userId: string, from: Date, to: Date) {
  return prisma.consumptionEntry.findMany({
    where: { userId, consumedAt: { gte: from, lt: to } },
    orderBy: { consumedAt: "asc" },
  });
}

/** Einträge eines Kalendertags (lokal). */
export async function entriesForDay(user: CurrentUser, day: string) {
  const rows = await entriesBetween(user.id, startOfDay(day, user.timezone), startOfDay(addDays(day, 1), user.timezone));
  return rows.map((r) => toEntryDTO(r, user.timezone));
}

/** Historie mit Filtern und Pagination. */
export async function historyPage(user: CurrentUser, raw: unknown) {
  const q = historyQuerySchema.parse(raw);
  const where: Prisma.ConsumptionEntryWhereInput = { userId: user.id };
  if (q.beverageId) where.beverageId = q.beverageId;
  if (q.from || q.to) {
    where.consumedAt = {
      ...(q.from ? { gte: startOfDay(q.from, user.timezone) } : {}),
      ...(q.to ? { lt: startOfDay(addDays(q.to, 1), user.timezone) } : {}),
    };
  }
  const [total, rows, sum] = await Promise.all([
    prisma.consumptionEntry.count({ where }),
    prisma.consumptionEntry.findMany({
      where,
      orderBy: { consumedAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.consumptionEntry.aggregate({ where, _sum: { alcoholGrams: true, servings: true } }),
  ]);
  return {
    items: rows.map((r) => toEntryDTO(r, user.timezone)),
    page: q.page,
    pageSize: q.pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / q.pageSize)),
    sumGrams: Number(sum._sum.alcoholGrams ?? 0),
    sumServings: sum._sum.servings ?? 0,
  };
}
