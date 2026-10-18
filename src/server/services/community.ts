import "server-only";
import { prisma } from "../db";
import { audit } from "../audit";
import { rankingWithShares } from "@/lib/statistics";
import { communitySchema } from "@/lib/validation";
import { CONSENT_VERSION } from "./profile";

export const COMMUNITY_PERIODS = ["week", "month", "all"] as const;
export type CommunityPeriod = (typeof COMMUNITY_PERIODS)[number];

/**
 * App-interne Community-Statistik (nur für angemeldete Benutzer sichtbar, keine Veröffentlichung im Internet).
 *
 * Definitionen:
 *  - Teilnehmer: aktive Konten mit ausdrücklicher Einwilligung (communityOptIn = true).
 *  - "Woche" = letzte 7 × 24 h, "Monat" = letzte 30 × 24 h, "Gesamt" = alle erfassten Einträge.
 *  - Gelöschte Konten: Einträge werden mit dem Konto gelöscht und erscheinen nicht mehr.
 *  - Widerruf der Teilnahme wirkt sofort (Werte werden bei jedem Aufruf neu berechnet).
 *  - Benutzer ohne Einträge im Zeitraum erscheinen nicht (keine Nullwerte).
 *  - Gemessen werden dokumentierte Mengen, nicht der tatsächliche Konsum.
 */
export async function communityRanking(period: CommunityPeriod, viewerId: string, now = new Date()) {
  const since =
    period === "week"
      ? new Date(now.getTime() - 7 * 86_400_000)
      : period === "month"
        ? new Date(now.getTime() - 30 * 86_400_000)
        : undefined;

  const grouped = await prisma.consumptionEntry.groupBy({
    by: ["userId"],
    where: {
      user: { communityOptIn: true, status: "ACTIVE" },
      ...(since ? { consumedAt: { gte: since, lte: now } } : { consumedAt: { lte: now } }),
    },
    _sum: { alcoholGrams: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, communityDisplay: true, communityPseudonym: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows = grouped.map((g) => {
    const u = byId.get(g.userId);
    const label = u?.communityDisplay === "DISPLAY_NAME" ? u.name : u?.communityPseudonym || "Anonym";
    return { userId: g.userId, label, grams: Number(g._sum.alcoholGrams ?? 0) };
  });
  const ranking = rankingWithShares(rows, 10);
  const participants = await prisma.user.count({ where: { communityOptIn: true, status: "ACTIVE" } });
  return {
    period,
    participantsTotal: participants,
    ...ranking,
    // Benutzer-IDs werden nicht an den Client gegeben – nur die Markierung "du"
    top: ranking.top.map(({ userId, ...r }) => ({ ...r, isViewer: userId === viewerId })),
  };
}

export async function updateCommunitySettings(userId: string, raw: unknown, headers?: Headers) {
  const input = communitySchema.parse(raw);
  await prisma.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { communityOptIn: true } });
    await tx.user.update({
      where: { id: userId },
      data: {
        communityOptIn: input.optIn,
        communityDisplay: input.display,
        communityPseudonym: input.pseudonym ?? null,
      },
    });
    if (before.communityOptIn !== input.optIn) {
      await tx.userConsent.create({
        data: { userId, type: "COMMUNITY_RANKING", granted: input.optIn, version: CONSENT_VERSION },
      });
    }
    await audit({ action: "community.updated", actorId: userId, targetUserId: userId, headers, metadata: { optIn: input.optIn, display: input.display } }, tx);
  });
}
