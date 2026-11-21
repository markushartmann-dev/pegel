import "server-only";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import type { CurrentUser } from "../current-user";
import { canEditBeverage, canUseBeverage } from "@/lib/permissions";
import {
  activityEntryInputSchema,
  activityEntryUpdateSchema,
  activityTypeInputSchema,
  activityTypeUpdateSchema,
  historyQuerySchema,
} from "@/lib/validation";
import { activityMinutesByDay, summarizeActivities, type ActivityStatEntry, type Intensity } from "@/lib/activities";
import { addDays, dayKey, daysBetween, firstOfMonth, lastOfMonth, startOfDay, startOfIsoWeek } from "@/lib/dates";
import { rankingWithShares } from "@/lib/statistics";
import { resolveTime } from "./entries";
import { communityParticipantWhere, type CommunityPeriod } from "./community";
import { Prisma } from "@/generated/prisma/client";

/**
 * Sport-Tracking. Sportarten funktionieren wie Getränke (Standard + eigene, archivieren statt löschen),
 * Einheiten speichern Name, Symbol und Intensität als Snapshot.
 * Sport wird bewusst nicht mit Alkohol verrechnet.
 */

// ---------- Sportarten ----------

export interface ActivityTypeDTO {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  defaultIntensity: Intensity;
  isDefault: boolean;
  isActive: boolean;
  isFavorite: boolean;
  own: boolean;
  suggestionStatus: "NONE" | "PENDING" | "REJECTED" | "APPROVED";
  suggestionNote: string | null;
}

type TypeRow = Prisma.ActivityTypeGetPayload<object>;

export function toActivityTypeDTO(a: TypeRow, userId: string): ActivityTypeDTO {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    defaultIntensity: a.defaultIntensity,
    isDefault: a.isDefault,
    isActive: a.isActive,
    isFavorite: a.isFavorite,
    own: a.ownerId === userId,
    suggestionStatus: a.suggestionStatus,
    suggestionNote: a.ownerId === userId ? a.suggestionNote : null,
  };
}

/** Standard-Sportarten + eigene Sportarten des Benutzers. */
export async function listActivityTypes(userId: string, opts: { includeArchived?: boolean } = {}) {
  const rows = await prisma.activityType.findMany({
    where: {
      OR: [{ ownerId: null, isDefault: true }, { ownerId: userId }],
      ...(opts.includeArchived ? {} : { isActive: true }),
    },
    orderBy: [{ isDefault: "desc" }, { isFavorite: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((a) => toActivityTypeDTO(a, userId));
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createActivityType(user: CurrentUser, raw: unknown, headers?: Headers) {
  const input = activityTypeInputSchema.parse(raw);
  try {
    const a = await prisma.activityType.create({
      data: {
        name: input.name,
        description: input.description || null,
        icon: input.icon,
        defaultIntensity: input.defaultIntensity,
        isFavorite: input.isFavorite ?? true,
        ownerId: user.id,
      },
    });
    await audit({ action: "activity_type.created", actorId: user.id, entityType: "activity_type", entityId: a.id, headers });
    return toActivityTypeDTO(a, user.id);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict("Du hast bereits eine Sportart mit diesem Namen (ggf. archiviert).");
    throw e;
  }
}

export async function updateActivityType(user: CurrentUser, id: string, raw: unknown, headers?: Headers) {
  const input = activityTypeUpdateSchema.parse(raw);
  const a = await prisma.activityType.findUnique({ where: { id } });
  // Fremde Sportarten werden wie nicht existierende behandelt (kein Informationsleck).
  if (!a || (a.ownerId !== null && a.ownerId !== user.id)) throw notFound("Sportart nicht gefunden.");
  if (!canEditBeverage(user, a)) throw forbidden("Standard-Sportarten können nur von der Administration geändert werden.");
  try {
    const updated = await prisma.activityType.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description === undefined ? undefined : input.description || null,
        icon: input.icon ?? undefined,
        defaultIntensity: input.defaultIntensity ?? undefined,
        isFavorite: input.isFavorite ?? undefined,
        isActive: input.isActive ?? undefined,
        // Archivieren zieht einen offenen Vorschlag zurück.
        ...(input.isActive === false && a.suggestionStatus === "PENDING" ? { suggestionStatus: "NONE" as const, suggestedAt: null } : {}),
      },
    });
    const action =
      input.isActive === false ? "activity_type.archived" : input.isActive === true && !a.isActive ? "activity_type.restored" : "activity_type.updated";
    await audit({
      action: a.isDefault ? "admin.default_activity_type_changed" : action,
      actorId: user.id,
      entityType: "activity_type",
      entityId: id,
      headers,
      metadata: { fields: Object.keys(input) },
    });
    return toActivityTypeDTO(updated, user.id);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict("Eine Sportart mit diesem Namen existiert bereits.");
    throw e;
  }
}

// ---------- Einheiten ----------

export interface ActivityEntryDTO {
  id: string;
  activityTypeId: string | null;
  activityName: string;
  icon: string | null;
  durationMin: number;
  intensity: Intensity;
  performedAt: string;
  timezone: string;
  note: string | null;
  day: string;
}

type EntryRow = Prisma.ActivityEntryGetPayload<object>;

export function toActivityEntryDTO(e: EntryRow, tz: string): ActivityEntryDTO {
  return {
    id: e.id,
    activityTypeId: e.activityTypeId,
    activityName: e.activityName,
    icon: e.icon,
    durationMin: e.durationMin,
    intensity: e.intensity,
    performedAt: e.performedAt.toISOString(),
    timezone: e.timezone,
    note: e.note,
    day: dayKey(e.performedAt, e.timezone || tz),
  };
}

export async function createActivity(user: CurrentUser, raw: unknown, headers?: Headers) {
  const input = activityEntryInputSchema.parse(raw);
  if (input.clientRequestId) {
    const existing = await prisma.activityEntry.findUnique({
      where: { userId_clientRequestId: { userId: user.id, clientRequestId: input.clientRequestId } },
    });
    if (existing) return { entry: toActivityEntryDTO(existing, user.timezone), duplicate: true };
  }
  const type = await prisma.activityType.findUnique({ where: { id: input.activityTypeId } });
  if (!type || !canUseBeverage(user, type)) throw notFound("Sportart nicht gefunden.");
  if (!type.isActive) throw badRequest("Diese Sportart ist archiviert.");
  const performedAt = resolveTime(input.performedAtLocal, input.timezone, "performedAtLocal");
  try {
    const entry = await prisma.$transaction(async (tx) => {
      const e = await tx.activityEntry.create({
        data: {
          userId: user.id,
          activityTypeId: type.id,
          activityName: type.name,
          icon: type.icon,
          durationMin: input.durationMin,
          intensity: input.intensity ?? type.defaultIntensity,
          performedAt,
          timezone: input.timezone,
          note: input.note || null,
          clientRequestId: input.clientRequestId ?? null,
        },
      });
      await audit({ action: "activity.created", actorId: user.id, entityType: "activity", entityId: e.id, headers }, tx);
      return e;
    });
    return { entry: toActivityEntryDTO(entry, user.timezone), duplicate: false };
  } catch (e) {
    if (isUniqueViolation(e) && input.clientRequestId) {
      const existing = await prisma.activityEntry.findUniqueOrThrow({
        where: { userId_clientRequestId: { userId: user.id, clientRequestId: input.clientRequestId } },
      });
      return { entry: toActivityEntryDTO(existing, user.timezone), duplicate: true };
    }
    throw e;
  }
}

async function loadOwn(user: CurrentUser, id: string) {
  const e = await prisma.activityEntry.findUnique({ where: { id } });
  // Fremde Einträge werden wie nicht existierende behandelt (Schutz vor IDOR)
  if (!e || e.userId !== user.id) throw notFound("Eintrag nicht gefunden.");
  return e;
}

export async function getActivity(user: CurrentUser, id: string) {
  return toActivityEntryDTO(await loadOwn(user, id), user.timezone);
}

export async function updateActivity(user: CurrentUser, id: string, raw: unknown, headers?: Headers) {
  const input = activityEntryUpdateSchema.parse(raw);
  const e = await loadOwn(user, id);
  const performedAt = input.performedAtLocal ? resolveTime(input.performedAtLocal, input.timezone ?? e.timezone, "performedAtLocal") : e.performedAt;
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.activityEntry.update({
      where: { id },
      data: {
        durationMin: input.durationMin ?? undefined,
        intensity: input.intensity ?? undefined,
        performedAt,
        timezone: input.timezone ?? e.timezone,
        note: input.note === undefined ? undefined : input.note || null,
      },
    });
    await audit({ action: "activity.updated", actorId: user.id, entityType: "activity", entityId: id, headers, metadata: { fields: Object.keys(input) } }, tx);
    return u;
  });
  return toActivityEntryDTO(updated, user.timezone);
}

export async function deleteActivity(user: CurrentUser, id: string, headers?: Headers) {
  await loadOwn(user, id);
  await prisma.$transaction(async (tx) => {
    await tx.activityEntry.delete({ where: { id } });
    await audit({ action: "activity.deleted", actorId: user.id, entityType: "activity", entityId: id, headers }, tx);
  });
}

export async function recentActivities(user: CurrentUser, take = 5) {
  const rows = await prisma.activityEntry.findMany({ where: { userId: user.id }, orderBy: { performedAt: "desc" }, take });
  return rows.map((r) => toActivityEntryDTO(r, user.timezone));
}

/** Einheiten der Kalendertage fromDay bis toDay (inklusive, Ortszeit der jeweiligen Einheit). */
export async function activitiesForDays(userId: string, fromDay: string, toDay: string, tz: string) {
  const margin = 26 * 3_600_000; // Zeitzonen liegen höchstens 26 Stunden auseinander
  const rows = await prisma.activityEntry.findMany({
    where: {
      userId,
      performedAt: {
        gte: new Date(startOfDay(fromDay, tz).getTime() - margin),
        lt: new Date(startOfDay(addDays(toDay, 1), tz).getTime() + margin),
      },
    },
    orderBy: { performedAt: "asc" },
  });
  return rows.filter((r) => {
    const day = dayKey(r.performedAt, r.timezone || tz);
    return day >= fromDay && day <= toDay;
  });
}

export async function activitiesForDay(user: CurrentUser, day: string) {
  return (await activitiesForDays(user.id, day, day, user.timezone)).map((r) => toActivityEntryDTO(r, user.timezone));
}

const toStat = (rows: EntryRow[]): ActivityStatEntry[] =>
  rows.map((r) => ({ performedAt: r.performedAt, durationMin: r.durationMin, intensity: r.intensity, activityName: r.activityName, timezone: r.timezone }));

/** Aktuelle Kalenderwoche (Montag bis heute) für die Dashboard-Kachel. */
export async function weeklyActivity(user: CurrentUser, now = new Date()) {
  const today = dayKey(now, user.timezone);
  const from = startOfIsoWeek(today);
  const rows = await activitiesForDays(user.id, from, today, user.timezone);
  const byDay = activityMinutesByDay(toStat(rows), user.timezone);
  return {
    fromDay: from,
    toDay: today,
    ...summarizeActivities(toStat(rows), user.timezone),
    days: daysBetween(from, addDays(from, 6)).map((d) => ({ day: d, minutes: byDay.get(d)?.minutes ?? 0 })),
    hasAny: (await prisma.activityEntry.count({ where: { userId: user.id }, take: 1 })) > 0,
  };
}

/** Kalender: Minuten pro Tag eines Monats. */
export async function monthActivity(user: CurrentUser, month: string) {
  const first = firstOfMonth(`${month}-01`);
  const rows = await activitiesForDays(user.id, first, lastOfMonth(first), user.timezone);
  const byDay = activityMinutesByDay(toStat(rows), user.timezone);
  return { days: Object.fromEntries(byDay), ...summarizeActivities(toStat(rows), user.timezone) };
}

/** Verlauf der Sporteinheiten mit Filtern und Pagination. */
export async function activityHistoryPage(user: CurrentUser, raw: unknown) {
  const q = historyQuerySchema.parse(raw);
  const where: Prisma.ActivityEntryWhereInput = { userId: user.id };
  if (q.activityTypeId) where.activityTypeId = q.activityTypeId;
  if (q.from || q.to) {
    where.performedAt = {
      ...(q.from ? { gte: startOfDay(q.from, user.timezone) } : {}),
      ...(q.to ? { lt: startOfDay(addDays(q.to, 1), user.timezone) } : {}),
    };
  }
  const [total, rows, sum] = await Promise.all([
    prisma.activityEntry.count({ where }),
    prisma.activityEntry.findMany({ where, orderBy: { performedAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    prisma.activityEntry.aggregate({ where, _sum: { durationMin: true } }),
  ]);
  return {
    items: rows.map((r) => toActivityEntryDTO(r, user.timezone)),
    page: q.page,
    pageSize: q.pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / q.pageSize)),
    sumMinutes: sum._sum.durationMin ?? 0,
  };
}

// ---------- Community ----------

/**
 * Bewegungs-Ranking: Summe der erfassten Minuten je teilnehmender Person (gleiche Einwilligung,
 * gleiche Inaktivitätsregel wie beim Trink-Ranking). Benutzer-IDs verlassen den Server nicht.
 */
export async function activityRanking(period: CommunityPeriod, viewerId: string, now = new Date()) {
  const since =
    period === "week" ? new Date(now.getTime() - 7 * 86_400_000) : period === "month" ? new Date(now.getTime() - 30 * 86_400_000) : undefined;
  const grouped = await prisma.activityEntry.groupBy({
    by: ["userId"],
    where: { user: communityParticipantWhere(now), performedAt: since ? { gte: since, lte: now } : { lte: now } },
    _sum: { durationMin: true },
    _count: { _all: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, communityDisplay: true, communityPseudonym: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const sessions = new Map(grouped.map((g) => [g.userId, g._count._all]));
  const ranking = rankingWithShares(
    grouped.map((g) => {
      const u = byId.get(g.userId);
      const label = u?.communityDisplay === "DISPLAY_NAME" ? u.name : u?.communityPseudonym || "Anonym";
      return { userId: g.userId, label, grams: g._sum.durationMin ?? 0 };
    }),
    10,
  );
  return {
    period,
    totalMinutes: ranking.total,
    participants: ranking.participants,
    top: ranking.top.map(({ userId, grams, ...r }) => ({ ...r, minutes: grams, sessions: sessions.get(userId) ?? 0, isViewer: userId === viewerId })),
  };
}

// ---------- Hinweis für bestehende Konten ----------

export async function dismissSportNotice(user: CurrentUser, headers?: Headers) {
  await prisma.user.update({ where: { id: user.id }, data: { sportNoticeDismissedAt: new Date() } });
  await audit({ action: "notice.dismissed", actorId: user.id, targetUserId: user.id, headers, metadata: { notice: "sport-1.6" } });
}
