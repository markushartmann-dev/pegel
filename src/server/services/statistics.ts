import "server-only";
import { prisma } from "../db";
import type { CurrentUser } from "../current-user";
import {
  aggregateBuckets,
  aggregateByCategory,
  aggregateByDay,
  compare,
  topBeverages,
  totals,
  type StatEntry,
} from "@/lib/statistics";
import {
  addDays,
  addMonths,
  dayKey,
  firstOfMonth,
  lastOfMonth,
  makeRange,
  periodRange,
  previousRange,
  type Period,
} from "@/lib/dates";
import { entriesBetween } from "./entries";

function toStat(rows: Awaited<ReturnType<typeof entriesBetween>>): StatEntry[] {
  return rows.map((r) => ({
    consumedAt: r.consumedAt,
    alcoholGrams: Number(r.alcoholGrams),
    servings: r.servings,
    category: r.category,
    beverageName: r.beverageName,
  }));
}

/** Kennzahlen für die Dashboard-Karten (heute, 7 Tage, 30 Tage). */
export async function dashboardSummary(user: CurrentUser, now = new Date()) {
  const tz = user.timezone;
  const r30 = periodRange("30d", now, tz);
  const prev30 = previousRange(r30, tz);
  const rows = toStat(await entriesBetween(user.id, prev30.from, r30.to));
  const cur = rows.filter((r) => r.consumedAt >= r30.from);
  const prev = rows.filter((r) => r.consumedAt < r30.from);
  const byDay = aggregateByDay(cur, r30.days, tz);
  const today = dayKey(now, tz);
  const last7 = byDay.slice(-7);
  const prev7 = byDay.slice(-14, -7);
  const t7 = totals(last7);
  const t30 = totals(byDay);
  const tPrev30 = totals(aggregateByDay(prev, prev30.days, tz));
  const todayStat = byDay.find((d) => d.day === today) ?? { day: today, grams: 0, drinks: 0, servings: 0 };
  return {
    today: todayStat,
    last7: t7,
    last30: t30,
    compare7: compare(t7.grams, totals(prev7).grams),
    compare30: compare(t30.grams, tPrev30.grams),
    byDay30: byDay,
    hasAnyEntries: (await prisma.consumptionEntry.count({ where: { userId: user.id }, take: 1 })) > 0,
  };
}

/** Ausführliche Statistik für einen Zeitraum inkl. Vergleich mit dem Vorzeitraum. */
export async function periodStatistics(user: CurrentUser, period: Period, custom?: { from?: string; to?: string }, now = new Date()) {
  const tz = user.timezone;
  const range = periodRange(period, now, tz, custom);
  const prev = previousRange(range, tz);
  const [curRows, prevRows] = await Promise.all([
    entriesBetween(user.id, range.from, range.to).then(toStat),
    entriesBetween(user.id, prev.from, prev.to).then(toStat),
  ]);
  const byDay = aggregateByDay(curRows, range.days, tz);
  const t = totals(byDay);
  const tPrev = totals(aggregateByDay(prevRows, prev.days, tz));

  // Wochen- und Monatsübersicht: unabhängig vom Filter die letzten 12 Wochen bzw. 12 Monate
  const today = dayKey(now, tz);
  const weeksRange = makeRange("custom", addDays(today, -83), today, tz);
  const monthsRange = makeRange("custom", addMonths(firstOfMonth(today), -11), lastOfMonth(today), tz);
  const longRows = toStat(await entriesBetween(user.id, monthsRange.from, monthsRange.to));
  const weekly = aggregateBuckets(aggregateByDay(longRows, weeksRange.days, tz), "week");
  const monthly = aggregateBuckets(aggregateByDay(longRows, monthsRange.days, tz), "month");

  return {
    range: { period, fromDay: range.fromDay, toDay: range.toDay, days: range.days.length },
    previous: { fromDay: prev.fromDay, toDay: prev.toDay },
    totals: t,
    previousTotals: tPrev,
    comparison: compare(t.grams, tPrev.grams),
    byDay,
    byCategory: aggregateByCategory(curRows),
    topBeverages: topBeverages(curRows),
    weekly,
    monthly,
  };
}

/** Kalender: Summen pro Tag eines Monats. */
export async function monthOverview(user: CurrentUser, month: string) {
  const tz = user.timezone;
  const first = firstOfMonth(`${month}-01`);
  const range = makeRange("custom", first, lastOfMonth(first), tz);
  const rows = toStat(await entriesBetween(user.id, range.from, range.to));
  const byDay = aggregateByDay(rows, range.days, tz);
  return { month: first.slice(0, 7), days: byDay, totals: totals(byDay) };
}
