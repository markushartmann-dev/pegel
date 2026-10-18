import "server-only";
import { prisma } from "../db";
import { env } from "../env";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { computeSavings, savingsBetween, type SavingsResult } from "@/lib/savings";
import type { CommunityPeriod } from "./community";

interface SavingsUser {
  id: string;
  timezone: string;
  createdAt: Date;
}

/** Kalendertage (in der Zeitzone des Benutzers) mit mindestens einem Eintrag seit `fromDay`. */
async function drinkDays(userId: string, tz: string, fromDay: string): Promise<string[]> {
  const from = startOfDay(fromDay, tz);
  const rows = await prisma.$queryRaw<{ day: string }[]>`
    SELECT DISTINCT to_char(("consumedAt" AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS day
    FROM consumption_entry
    WHERE "userId" = ${userId} AND "consumedAt" >= ${from}`;
  return rows.map((r) => r.day);
}

export interface UserSavings extends Omit<SavingsResult, "events"> {
  startDay: string;
  /** Heute bisher ohne Eintrag (zählt erst nach Mitternacht) */
  todayDry: boolean;
  rules: typeof env.savings;
  /** Beträge der letzten 7 bzw. 30 abgeschlossenen Tage */
  last7: number;
  last30: number;
}

async function compute(user: SavingsUser, now: Date) {
  const tz = user.timezone;
  const today = dayKey(now, tz);
  const startDay = dayKey(user.createdAt, tz);
  const days = await drinkDays(user.id, tz, startDay);
  const result = computeSavings(startDay, addDays(today, -1), days, env.savings);
  return { result, today, startDay, todayDry: !days.includes(today) };
}

export async function userSavings(user: SavingsUser, now = new Date()): Promise<UserSavings> {
  const { result, today, startDay, todayDry } = await compute(user, now);
  const { events, ...rest } = result;
  const yesterday = addDays(today, -1);
  return {
    ...rest,
    startDay,
    todayDry,
    rules: env.savings,
    last7: savingsBetween(events, addDays(today, -7), yesterday),
    last30: savingsBetween(events, addDays(today, -30), yesterday),
  };
}

/**
 * Sparschwein-Ranking unter den Community-Teilnehmenden.
 * "Woche"/"Monat" = die letzten 7 bzw. 30 abgeschlossenen Tage in der Zeitzone des jeweiligen Benutzers.
 */
export async function savingsRanking(period: CommunityPeriod, viewerId: string, now = new Date()) {
  const users = await prisma.user.findMany({
    where: { communityOptIn: true, status: "ACTIVE", onboardingCompleted: true },
    select: { id: true, name: true, timezone: true, createdAt: true, communityDisplay: true, communityPseudonym: true },
  });
  const rows = await Promise.all(
    users.map(async (u) => {
      const { result, today } = await compute(u, now);
      const yesterday = addDays(today, -1);
      const amount =
        period === "week"
          ? savingsBetween(result.events, addDays(today, -7), yesterday)
          : period === "month"
            ? savingsBetween(result.events, addDays(today, -30), yesterday)
            : result.total;
      return {
        label: u.communityDisplay === "DISPLAY_NAME" ? u.name : u.communityPseudonym || "Anonym",
        amount,
        streak: result.currentStreak,
        isViewer: u.id === viewerId,
      };
    }),
  );
  const sorted = rows.sort((a, b) => b.amount - a.amount || b.streak - a.streak);
  return {
    period,
    total: sorted.reduce((a, r) => a + r.amount, 0),
    participants: sorted.length,
    top: sorted.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 })),
  };
}
