import { describe, expect, it } from "vitest";
import { computeSavings, savingsBetween } from "@/lib/savings";

describe("Sparschwein", () => {
  it("5 € pro Tag ohne Eintrag, nichts für Tage mit Eintrag", () => {
    const r = computeSavings("2026-10-01", "2026-10-05", ["2026-10-03"]);
    expect(r.dryDays).toBe(4);
    expect(r.total).toBe(20);
    expect(r.currentStreak).toBe(2);
    expect(r.longestStreak).toBe(2);
    expect(r.daysToWeekBonus).toBe(5);
  });

  it("+10 € für jede volle Woche am Stück", () => {
    const r = computeSavings("2026-10-01", "2026-10-14", []);
    expect(r.weekBonuses).toBe(2);
    expect(r.total).toBe(14 * 5 + 2 * 10);
    expect(r.daysToWeekBonus).toBe(7);
  });

  it("eine Unterbrechung setzt die Serie zurück", () => {
    const r = computeSavings("2026-10-01", "2026-10-13", ["2026-10-07"]);
    // Serie 1: 6 Tage (kein Bonus), Serie 2: 6 Tage (kein Bonus)
    expect(r.weekBonuses).toBe(0);
    expect(r.total).toBe(12 * 5);
  });

  it("+20 € für einen kompletten Kalendermonat ohne Eintrag", () => {
    const r = computeSavings("2026-02-01", "2026-02-28", []);
    expect(r.monthBonuses).toBe(1);
    expect(r.weekBonuses).toBe(4);
    expect(r.total).toBe(28 * 5 + 4 * 10 + 20);
  });

  it("kein Monatsbonus für angebrochene Monate (Start mitten im Monat oder Eintrag im Monat)", () => {
    expect(computeSavings("2026-02-02", "2026-02-28", []).monthBonuses).toBe(0);
    expect(computeSavings("2026-02-01", "2026-02-28", ["2026-02-27"]).monthBonuses).toBe(0);
    // Monat noch nicht zu Ende
    expect(computeSavings("2026-02-01", "2026-02-27", []).monthBonuses).toBe(0);
  });

  it("Serien laufen über Monatsgrenzen", () => {
    const r = computeSavings("2026-01-28", "2026-02-03", []);
    expect(r.weekBonuses).toBe(1);
    expect(r.events.find((e) => e.type === "week")?.day).toBe("2026-02-03");
  });

  it("leerer Zeitraum (z. B. am Registrierungstag)", () => {
    const r = computeSavings("2026-10-18", "2026-10-17", []);
    expect(r).toMatchObject({ total: 0, dryDays: 0, countedDays: 0, currentStreak: 0 });
  });

  it("Summe für einen Teilzeitraum berücksichtigt Boni nach Datum", () => {
    const r = computeSavings("2026-10-01", "2026-10-14", []);
    // 08.–14.10.: 7 Tage × 5 + Wochenbonus am 14.10.
    expect(savingsBetween(r.events, "2026-10-08", "2026-10-14")).toBe(45);
    // 01.–06.10.: noch kein Bonus
    expect(savingsBetween(r.events, "2026-10-01", "2026-10-06")).toBe(30);
  });

  it("eigene Beträge", () => {
    const r = computeSavings("2026-10-01", "2026-10-07", [], { perDay: 2, weekBonus: 3, monthBonus: 0 });
    expect(r.total).toBe(17);
  });
});
