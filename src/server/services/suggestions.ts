import "server-only";
import { z } from "zod";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, notFound } from "../errors";
import type { CurrentUser } from "../current-user";

/**
 * Eigene Getränke für alle vorschlagen: Der Benutzer schlägt ein eigenes Getränk vor, die
 * Administration gibt es frei (es wird zum Standardgetränk) oder lehnt es mit Begründung ab.
 * Bei der Freigabe wird das Getränk selbst global – vorhandene Einträge behalten ihren Bezug.
 */

export async function suggestBeverage(user: CurrentUser, id: string, headers?: Headers) {
  const b = await prisma.beverage.findUnique({ where: { id } });
  if (!b || b.ownerId !== user.id) throw notFound("Getränk nicht gefunden.");
  if (!b.isActive) throw badRequest("Archivierte Getränke können nicht vorgeschlagen werden.");
  if (b.suggestionStatus === "PENDING") return { status: "PENDING" as const };
  const clash = await prisma.beverage.findFirst({ where: { ownerId: null, isDefault: true, name: b.name }, select: { id: true } });
  if (clash) throw conflict("Es gibt bereits ein Standardgetränk mit diesem Namen. Benenne dein Getränk vorher um.");
  await prisma.beverage.update({
    where: { id },
    data: { suggestionStatus: "PENDING", suggestedAt: new Date(), suggestedById: user.id, suggestionNote: null, reviewedAt: null },
  });
  await audit({ action: "beverage.suggested", actorId: user.id, entityType: "beverage", entityId: id, headers });
  return { status: "PENDING" as const };
}

export async function withdrawSuggestion(user: CurrentUser, id: string, headers?: Headers) {
  const b = await prisma.beverage.findUnique({ where: { id } });
  if (!b || b.ownerId !== user.id) throw notFound("Getränk nicht gefunden.");
  if (b.suggestionStatus !== "PENDING") return { status: b.suggestionStatus };
  await prisma.beverage.update({ where: { id }, data: { suggestionStatus: "NONE", suggestedAt: null } });
  await audit({ action: "beverage.suggestion_withdrawn", actorId: user.id, entityType: "beverage", entityId: id, headers });
  return { status: "NONE" as const };
}

export async function listSuggestions() {
  const rows = await prisma.beverage.findMany({
    where: { suggestionStatus: "PENDING", ownerId: { not: null } },
    orderBy: { suggestedAt: "asc" },
    include: { owner: { select: { id: true, name: true } } },
  });
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    volumeMl: b.volumeMl,
    abv: Number(b.abv),
    alcoholGrams: Number(b.alcoholGrams),
    suggestedAt: b.suggestedAt,
    owner: b.owner,
  }));
}

export const pendingSuggestionCount = () => prisma.beverage.count({ where: { suggestionStatus: "PENDING", ownerId: { not: null } } });

export const reviewSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve") }),
  z.object({ decision: z.literal("reject"), note: z.string().trim().min(3, "Bitte kurz begründen.").max(300) }),
]);

export async function reviewSuggestion(actor: CurrentUser, id: string, raw: unknown, headers?: Headers) {
  const input = reviewSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const b = await tx.beverage.findUnique({ where: { id } });
    if (!b || b.suggestionStatus !== "PENDING" || !b.ownerId) throw notFound("Vorschlag nicht gefunden oder bereits bearbeitet.");
    if (input.decision === "reject") {
      await tx.beverage.update({ where: { id }, data: { suggestionStatus: "REJECTED", suggestionNote: input.note, reviewedAt: new Date() } });
      await audit({ action: "admin.beverage_suggestion_rejected", actorId: actor.id, targetUserId: b.ownerId, entityType: "beverage", entityId: id, headers }, tx);
      return { status: "REJECTED" as const };
    }
    const clash = await tx.beverage.findFirst({ where: { ownerId: null, isDefault: true, name: b.name }, select: { id: true } });
    if (clash) throw conflict("Es gibt bereits ein Standardgetränk mit diesem Namen. Bitte ablehnen und Umbenennung erbitten.");
    const last = await tx.beverage.aggregate({ where: { ownerId: null, isDefault: true }, _max: { sortOrder: true } });
    await tx.beverage.update({
      where: { id },
      data: {
        ownerId: null,
        isDefault: true,
        isFavorite: false,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        suggestionStatus: "APPROVED",
        reviewedAt: new Date(),
      },
    });
    await audit({ action: "admin.beverage_suggestion_approved", actorId: actor.id, targetUserId: b.ownerId, entityType: "beverage", entityId: id, headers }, tx);
    return { status: "APPROVED" as const };
  });
}

// ---------- Sportarten ----------

export async function suggestActivityType(user: CurrentUser, id: string, headers?: Headers) {
  const a = await prisma.activityType.findUnique({ where: { id } });
  if (!a || a.ownerId !== user.id) throw notFound("Sportart nicht gefunden.");
  if (!a.isActive) throw badRequest("Archivierte Sportarten können nicht vorgeschlagen werden.");
  if (a.suggestionStatus === "PENDING") return { status: "PENDING" as const };
  const clash = await prisma.activityType.findFirst({ where: { ownerId: null, isDefault: true, name: a.name }, select: { id: true } });
  if (clash) throw conflict("Es gibt bereits eine Standard-Sportart mit diesem Namen. Benenne deine Sportart vorher um.");
  await prisma.activityType.update({
    where: { id },
    data: { suggestionStatus: "PENDING", suggestedAt: new Date(), suggestedById: user.id, suggestionNote: null, reviewedAt: null },
  });
  await audit({ action: "activity_type.suggested", actorId: user.id, entityType: "activity_type", entityId: id, headers });
  return { status: "PENDING" as const };
}

export async function withdrawActivitySuggestion(user: CurrentUser, id: string, headers?: Headers) {
  const a = await prisma.activityType.findUnique({ where: { id } });
  if (!a || a.ownerId !== user.id) throw notFound("Sportart nicht gefunden.");
  if (a.suggestionStatus !== "PENDING") return { status: a.suggestionStatus };
  await prisma.activityType.update({ where: { id }, data: { suggestionStatus: "NONE", suggestedAt: null } });
  await audit({ action: "activity_type.suggestion_withdrawn", actorId: user.id, entityType: "activity_type", entityId: id, headers });
  return { status: "NONE" as const };
}

export async function listActivitySuggestions() {
  const rows = await prisma.activityType.findMany({
    where: { suggestionStatus: "PENDING", ownerId: { not: null } },
    orderBy: { suggestedAt: "asc" },
    include: { owner: { select: { id: true, name: true } } },
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    defaultIntensity: a.defaultIntensity,
    suggestedAt: a.suggestedAt,
    owner: a.owner,
  }));
}

/** Offene Vorschläge insgesamt (Getränke und Sportarten) für den Admin-Tab. */
export async function pendingAllSuggestionCount() {
  const [b, a] = await Promise.all([pendingSuggestionCount(), prisma.activityType.count({ where: { suggestionStatus: "PENDING", ownerId: { not: null } } })]);
  return b + a;
}

export async function reviewActivitySuggestion(actor: CurrentUser, id: string, raw: unknown, headers?: Headers) {
  const input = reviewSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const a = await tx.activityType.findUnique({ where: { id } });
    if (!a || a.suggestionStatus !== "PENDING" || !a.ownerId) throw notFound("Vorschlag nicht gefunden oder bereits bearbeitet.");
    if (input.decision === "reject") {
      await tx.activityType.update({ where: { id }, data: { suggestionStatus: "REJECTED", suggestionNote: input.note, reviewedAt: new Date() } });
      await audit({ action: "admin.activity_suggestion_rejected", actorId: actor.id, targetUserId: a.ownerId, entityType: "activity_type", entityId: id, headers }, tx);
      return { status: "REJECTED" as const };
    }
    const clash = await tx.activityType.findFirst({ where: { ownerId: null, isDefault: true, name: a.name }, select: { id: true } });
    if (clash) throw conflict("Es gibt bereits eine Standard-Sportart mit diesem Namen. Bitte ablehnen und Umbenennung erbitten.");
    const last = await tx.activityType.aggregate({ where: { ownerId: null, isDefault: true }, _max: { sortOrder: true } });
    await tx.activityType.update({
      where: { id },
      data: { ownerId: null, isDefault: true, isFavorite: false, sortOrder: (last._max.sortOrder ?? 0) + 1, suggestionStatus: "APPROVED", reviewedAt: new Date() },
    });
    await audit({ action: "admin.activity_suggestion_approved", actorId: actor.id, targetUserId: a.ownerId, entityType: "activity_type", entityId: id, headers }, tx);
    return { status: "APPROVED" as const };
  });
}
