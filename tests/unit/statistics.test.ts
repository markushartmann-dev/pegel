import { describe, expect, it } from "vitest";
import {
  aggregateBuckets,
  aggregateByCategory,
  aggregateByDay,
  compare,
  rankingWithShares,
  topBeverages,
  totals,
  type StatEntry,
} from "@/lib/statistics";
import { daysBetween } from "@/lib/dates";

const tz = "Europe/Berlin";
const e = (iso: string, grams: number, category = "BEER", servings = 1, name = "Bier"): StatEntry => ({
  consumedAt: new Date(iso),
  alcoholGrams: grams,
  servings,
  category,
  beverageName: name,
});

describe("Tagesaggregation", () => {
  const days = daysBetween("2026-10-12", "2026-10-18");
  const entries = [
    e("2026-10-12T18:00:00Z", 19.73),
    e("2026-10-12T21:59:00Z", 19.73), // 23:59 lokal → noch 12.10.
    e("2026-10-12T22:01:00Z", 8.68, "SPARKLING", 1, "Sekt"), // 00:01 lokal → 13.10.
    e("2026-10-18T10:00:00Z", 26.04, "BEER", 2),
    e("2026-10-30T10:00:00Z", 100), // außerhalb
  ];

  it("ordnet Einträge nach lokalem Kalendertag zu", () => {
    const byDay = aggregateByDay(entries, days, tz);
    expect(byDay).toHaveLength(7);
    expect(byDay[0]).toEqual({ day: "2026-10-12", grams: 39.46, drinks: 2, servings: 2 });
    expect(byDay[1].grams).toBe(8.68);
    expect(byDay[6]).toEqual({ day: "2026-10-18", grams: 26.04, drinks: 1, servings: 2 });
    expect(byDay[3].grams).toBe(0);
  });

  it("Summen und Durchschnitte", () => {
    const t = totals(aggregateByDay(entries, days, tz));
    expect(t.grams).toBe(74.18);
    expect(t.drinks).toBe(4);
    expect(t.servings).toBe(5);
    expect(t.activeDays).toBe(3);
    expect(t.avgPerDay).toBeCloseTo(74.18 / 7, 2);
    expect(t.avgPerActiveDay).toBeCloseTo(74.18 / 3, 2);
  });

  it("leerer Zeitraum", () => {
    const t = totals(aggregateByDay([], days, tz));
    expect(t).toMatchObject({ grams: 0, drinks: 0, activeDays: 0, avgPerDay: 0, avgPerActiveDay: 0 });
  });

  it("Wochen- und Monatsbuckets", () => {
    const byDay = aggregateByDay(entries, daysBetween("2026-09-28", "2026-10-18"), tz);
    const weeks = aggregateBuckets(byDay, "week");
    expect(weeks.map((w) => w.key)).toEqual(["2026-W40", "2026-W41", "2026-W42"]);
    expect(weeks[2].grams).toBe(74.18);
    const months = aggregateBuckets(byDay, "month");
    expect(months.map((m) => m.key)).toEqual(["2026-09", "2026-10"]);
  });

  it("Kategorien mit Anteilen", () => {
    const cats = aggregateByCategory(entries.slice(0, 4));
    expect(cats[0].category).toBe("BEER");
    expect(cats.reduce((a, c) => a + c.share, 0)).toBeCloseTo(1, 9);
  });

  it("Top-Getränke nach Portionen", () => {
    const top = topBeverages(entries.slice(0, 4));
    expect(top[0]).toMatchObject({ name: "Bier", drinks: 4 });
  });
});

describe("Vergleich", () => {
  it("relative Veränderung", () => {
    expect(compare(150, 100).change).toBeCloseTo(0.5);
    expect(compare(50, 100).change).toBeCloseTo(-0.5);
    expect(compare(10, 0).change).toBeNull();
  });
});

describe("Community-Ranking", () => {
  it("Top 10, Anteile, Rest und Ausschluss von Nullwerten", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ userId: `u${i}`, label: `P${i}`, grams: (i + 1) * 10 }));
    rows.push({ userId: "zero", label: "Z", grams: 0 });
    const r = rankingWithShares(rows, 10);
    expect(r.participants).toBe(12);
    expect(r.top).toHaveLength(10);
    expect(r.top[0]).toMatchObject({ userId: "u11", rank: 1, grams: 120 });
    expect(r.rest).toMatchObject({ grams: 30, count: 2 });
    const sum = r.top.reduce((a, x) => a + x.share, 0) + (r.rest?.share ?? 0);
    expect(sum).toBeCloseTo(1, 9);
  });
  it("leer", () => {
    expect(rankingWithShares([])).toMatchObject({ total: 0, participants: 0, top: [], rest: null });
  });
});
