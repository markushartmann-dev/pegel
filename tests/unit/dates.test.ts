import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayKey,
  daysBetween,
  isoWeekKey,
  isValidDayKey,
  isValidTimeZone,
  lastOfMonth,
  parseLocalDateTime,
  periodRange,
  previousRange,
  startOfDay,
  startOfIsoWeek,
  toLocalDateTimeInput,
  tzOffsetMs,
} from "@/lib/dates";

const BERLIN = "Europe/Berlin";

describe("Zeitzonen", () => {
  it("erkennt gültige Zeitzonen", () => {
    expect(isValidTimeZone(BERLIN)).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("Offset Berlin Winter/Sommer", () => {
    expect(tzOffsetMs(Date.UTC(2026, 0, 15, 12), BERLIN)).toBe(3_600_000);
    expect(tzOffsetMs(Date.UTC(2026, 6, 15, 12), BERLIN)).toBe(7_200_000);
  });

  it("lokale Zeit → UTC (Winter und Sommer)", () => {
    expect(parseLocalDateTime("2026-01-15T20:00", BERLIN)!.toISOString()).toBe("2026-01-15T19:00:00.000Z");
    expect(parseLocalDateTime("2026-07-15T20:00", BERLIN)!.toISOString()).toBe("2026-07-15T18:00:00.000Z");
    expect(parseLocalDateTime("2026-07-15T20:00", "America/New_York")!.toISOString()).toBe("2026-07-16T00:00:00.000Z");
  });

  it("Sommerzeitbeginn: nicht existierende Uhrzeit wird nach vorne verschoben", () => {
    // 29.03.2026 02:00 → 03:00 MESZ; 02:30 existiert nicht
    const d = parseLocalDateTime("2026-03-29T02:30", BERLIN)!;
    expect(d.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(toLocalDateTimeInput(d, BERLIN)).toBe("2026-03-29T03:30");
  });

  it("Sommerzeitende: doppelte Uhrzeit wird als erstes Vorkommen interpretiert", () => {
    // 25.10.2026 03:00 MESZ → 02:00 MEZ; 02:30 gibt es zweimal
    const d = parseLocalDateTime("2026-10-25T02:30", BERLIN)!;
    expect(d.toISOString()).toBe("2026-10-25T00:30:00.000Z");
  });

  it("Rundreise lokale Eingabe ↔ Date", () => {
    for (const v of ["2026-02-28T23:59", "2026-12-31T00:00", "2026-06-01T12:34"]) {
      expect(toLocalDateTimeInput(parseLocalDateTime(v, BERLIN)!, BERLIN)).toBe(v);
    }
  });

  it("lehnt ungültige Eingaben ab", () => {
    expect(parseLocalDateTime("2026-02-30T10:00", BERLIN)).toBeNull();
    expect(parseLocalDateTime("2026-13-01T10:00", BERLIN)).toBeNull();
    expect(parseLocalDateTime("2026-01-01T24:00", BERLIN)).toBeNull();
    expect(parseLocalDateTime("gestern", BERLIN)).toBeNull();
  });
});

describe("Tagesgrenzen", () => {
  it("Tag eines Zeitpunkts hängt von der Zeitzone ab", () => {
    const t = Date.UTC(2026, 5, 1, 22, 30); // 00:30 MESZ am 02.06.
    expect(dayKey(t, BERLIN)).toBe("2026-06-02");
    expect(dayKey(t, "UTC")).toBe("2026-06-01");
  });

  it("Tagesbeginn und Tageslänge an Umstellungstagen", () => {
    const start = startOfDay("2026-03-29", BERLIN).getTime();
    const next = startOfDay("2026-03-30", BERLIN).getTime();
    expect(new Date(start).toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect((next - start) / 3_600_000).toBe(23);
    const autumn = startOfDay("2026-10-25", BERLIN).getTime();
    const autumnNext = startOfDay("2026-10-26", BERLIN).getTime();
    expect((autumnNext - autumn) / 3_600_000).toBe(25);
  });

  it("Kalenderarithmetik", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(lastOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(daysBetween("2026-03-28", "2026-03-31")).toEqual(["2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"]);
    expect(isValidDayKey("2026-02-29")).toBe(false);
    expect(isValidDayKey("2028-02-29")).toBe(true);
  });

  it("ISO-Wochen", () => {
    expect(isoWeekKey("2026-01-01")).toBe("2026-W01");
    expect(isoWeekKey("2027-01-01")).toBe("2026-W53");
    expect(isoWeekKey("2025-12-29")).toBe("2026-W01");
    expect(startOfIsoWeek("2026-10-18")).toBe("2026-10-12");
  });
});

describe("Zeiträume", () => {
  const now = new Date(Date.UTC(2026, 9, 18, 8, 0)); // So 18.10.2026 10:00 MESZ

  it("heute / 7 / 30 Tage schließen heute ein", () => {
    expect(periodRange("today", now, BERLIN).days).toEqual(["2026-10-18"]);
    const w = periodRange("7d", now, BERLIN);
    expect(w.fromDay).toBe("2026-10-12");
    expect(w.days).toHaveLength(7);
    expect(periodRange("30d", now, BERLIN).days).toHaveLength(30);
  });

  it("aktueller und vorheriger Monat", () => {
    const m = periodRange("month", now, BERLIN);
    expect(m.fromDay).toBe("2026-10-01");
    expect(m.toDay).toBe("2026-10-18");
    const p = periodRange("prev-month", now, BERLIN);
    expect(p.fromDay).toBe("2026-09-01");
    expect(p.toDay).toBe("2026-09-30");
  });

  it("individueller Zeitraum (vertauschte Grenzen werden korrigiert)", () => {
    const c = periodRange("custom", now, BERLIN, { from: "2026-10-10", to: "2026-10-01" });
    expect(c.fromDay).toBe("2026-10-01");
    expect(c.toDay).toBe("2026-10-10");
    expect(c.to.toISOString()).toBe("2026-10-10T22:00:00.000Z");
  });

  it("Vorzeitraum gleicher Länge", () => {
    const w = periodRange("7d", now, BERLIN);
    const prev = previousRange(w, BERLIN);
    expect(prev.fromDay).toBe("2026-10-05");
    expect(prev.toDay).toBe("2026-10-11");
    const m = previousRange(periodRange("month", now, BERLIN), BERLIN);
    expect(m.fromDay).toBe("2026-09-01");
    expect(m.toDay).toBe("2026-09-18");
  });

  it("Zeitraum mit Zeitumstellung umfasst die korrekte absolute Dauer", () => {
    const r = periodRange("custom", now, BERLIN, { from: "2026-10-25", to: "2026-10-25" });
    expect((r.to.getTime() - r.from.getTime()) / 3_600_000).toBe(25);
  });
});
