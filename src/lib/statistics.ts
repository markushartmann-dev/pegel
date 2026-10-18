/**
 * Reine Aggregationsfunktionen für Statistiken (ohne Datenbankzugriff, gut testbar).
 * Tagesgrenzen werden über die Zeitzone des Benutzers bestimmt (siehe lib/dates.ts).
 */
import { dayKey, isoWeekKey, monthKey } from "./dates";

export interface StatEntry {
  consumedAt: Date;
  alcoholGrams: number;
  servings: number;
  category: string;
  beverageName: string;
}

export interface DayStat {
  day: string;
  grams: number;
  drinks: number;
  servings: number;
}

export interface Totals {
  grams: number;
  drinks: number;
  servings: number;
  activeDays: number;
  days: number;
  /** Durchschnitt pro Kalendertag im Zeitraum (auch Tage ohne Einträge zählen mit) */
  avgPerDay: number;
  /** Durchschnitt pro Tag mit Einträgen */
  avgPerActiveDay: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function aggregateByDay(entries: readonly StatEntry[], days: readonly string[], tz: string): DayStat[] {
  const map = new Map<string, DayStat>(days.map((d) => [d, { day: d, grams: 0, drinks: 0, servings: 0 }]));
  for (const e of entries) {
    const k = dayKey(e.consumedAt, tz);
    const s = map.get(k);
    if (!s) continue; // außerhalb des Zeitraums
    s.grams += e.alcoholGrams;
    s.drinks += 1;
    s.servings += e.servings;
  }
  return [...map.values()].map((s) => ({ ...s, grams: round2(s.grams) }));
}

export function totals(byDay: readonly DayStat[]): Totals {
  const grams = byDay.reduce((a, d) => a + d.grams, 0);
  const drinks = byDay.reduce((a, d) => a + d.drinks, 0);
  const servings = byDay.reduce((a, d) => a + d.servings, 0);
  const activeDays = byDay.filter((d) => d.drinks > 0).length;
  return {
    grams: round2(grams),
    drinks,
    servings,
    activeDays,
    days: byDay.length,
    avgPerDay: byDay.length ? round2(grams / byDay.length) : 0,
    avgPerActiveDay: activeDays ? round2(grams / activeDays) : 0,
  };
}

export interface BucketStat {
  key: string;
  grams: number;
  drinks: number;
  days: number;
}

export function aggregateBuckets(byDay: readonly DayStat[], bucket: "week" | "month"): BucketStat[] {
  const map = new Map<string, BucketStat>();
  for (const d of byDay) {
    const key = bucket === "week" ? isoWeekKey(d.day) : monthKey(d.day);
    const b = map.get(key) ?? { key, grams: 0, drinks: 0, days: 0 };
    b.grams += d.grams;
    b.drinks += d.drinks;
    b.days += 1;
    map.set(key, b);
  }
  return [...map.values()].map((b) => ({ ...b, grams: round2(b.grams) }));
}

export interface CategoryStat {
  category: string;
  grams: number;
  drinks: number;
  share: number;
}

export function aggregateByCategory(entries: readonly StatEntry[]): CategoryStat[] {
  const map = new Map<string, { grams: number; drinks: number }>();
  let total = 0;
  for (const e of entries) {
    const c = map.get(e.category) ?? { grams: 0, drinks: 0 };
    c.grams += e.alcoholGrams;
    c.drinks += 1;
    total += e.alcoholGrams;
    map.set(e.category, c);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      grams: round2(v.grams),
      drinks: v.drinks,
      share: total > 0 ? v.grams / total : 0,
    }))
    .sort((a, b) => b.grams - a.grams);
}

export interface Comparison {
  current: number;
  previous: number;
  /** relative Veränderung (z. B. 0,25 = +25 %); null, wenn der Vorzeitraum leer ist */
  change: number | null;
  diff: number;
}

export function compare(current: number, previous: number): Comparison {
  return {
    current: round2(current),
    previous: round2(previous),
    diff: round2(current - previous),
    change: previous > 0 ? (current - previous) / previous : null,
  };
}

export function topBeverages(entries: readonly StatEntry[], limit = 5) {
  const map = new Map<string, { name: string; grams: number; drinks: number }>();
  for (const e of entries) {
    const v = map.get(e.beverageName) ?? { name: e.beverageName, grams: 0, drinks: 0 };
    v.grams += e.alcoholGrams;
    v.drinks += e.servings;
    map.set(e.beverageName, v);
  }
  return [...map.values()]
    .map((v) => ({ ...v, grams: round2(v.grams) }))
    .sort((a, b) => b.drinks - a.drinks || b.grams - a.grams)
    .slice(0, limit);
}

export interface RankingRow {
  userId: string;
  label: string;
  grams: number;
}

/** Top-N plus Anteil am Gesamtvolumen. Rest wird als "Weitere" zusammengefasst. */
export function rankingWithShares(rows: readonly RankingRow[], limit = 10) {
  const sorted = [...rows].filter((r) => r.grams > 0).sort((a, b) => b.grams - a.grams);
  const total = sorted.reduce((a, r) => a + r.grams, 0);
  const top = sorted.slice(0, limit).map((r, i) => ({
    ...r,
    rank: i + 1,
    grams: round2(r.grams),
    share: total > 0 ? r.grams / total : 0,
  }));
  const restGrams = sorted.slice(limit).reduce((a, r) => a + r.grams, 0);
  return {
    total: round2(total),
    participants: sorted.length,
    top,
    rest: restGrams > 0 ? { grams: round2(restGrams), share: restGrams / total, count: sorted.length - limit } : null,
  };
}
