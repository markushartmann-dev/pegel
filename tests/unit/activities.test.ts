import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACTIVITY_TYPES,
  DURATION_PRESETS,
  activityMinutesByDay,
  formatDuration,
  summarizeActivities,
  whoMinutes,
  WHO_WEEKLY_MINUTES,
} from "@/lib/activities";
import { activityEntryInputSchema } from "@/lib/validation";

describe("Sport: WHO-Richtwert", () => {
  it("mittel zählt einfach, intensiv doppelt, leicht nicht", () => {
    expect(whoMinutes(60, "MODERATE")).toBe(60);
    expect(whoMinutes(30, "VIGOROUS")).toBe(60);
    expect(whoMinutes(90, "LIGHT")).toBe(0);
  });

  it("Wochensumme mit Tagen, Intensitäten und Anteil am Richtwert", () => {
    const tz = "Europe/Berlin";
    const s = summarizeActivities(
      [
        { performedAt: new Date("2026-11-16T17:00:00Z"), durationMin: 60, intensity: "MODERATE", activityName: "Radfahren" },
        { performedAt: new Date("2026-11-16T19:00:00Z"), durationMin: 30, intensity: "VIGOROUS", activityName: "Laufen" },
        { performedAt: new Date("2026-11-18T07:00:00Z"), durationMin: 45, intensity: "LIGHT", activityName: "Yoga" },
      ],
      tz,
    );
    expect(s).toMatchObject({ sessions: 3, minutes: 135, whoMinutes: 120, activeDays: 2, byIntensity: { LIGHT: 45, MODERATE: 60, VIGOROUS: 30 } });
    expect(s.whoShare).toBeCloseTo(120 / WHO_WEEKLY_MINUTES, 6);
  });

  it("Tageszuordnung nach Ortszeit der Einheit", () => {
    // 23:30 Uhr in Berlin ist in UTC noch der Vortag 22:30 – zählt zum Berliner Kalendertag
    const m = activityMinutesByDay([{ performedAt: new Date("2026-11-16T22:30:00Z"), durationMin: 40, intensity: "MODERATE", activityName: "x", timezone: "Europe/Berlin" }], "UTC");
    expect([...m.keys()]).toEqual(["2026-11-16"]);
    const n = activityMinutesByDay([{ performedAt: new Date("2026-11-16T23:30:00Z"), durationMin: 40, intensity: "MODERATE", activityName: "x", timezone: "Europe/Berlin" }], "UTC");
    expect([...n.keys()]).toEqual(["2026-11-17"]);
  });
});

describe("Sport: Darstellung und Vorgaben", () => {
  it("formatiert Dauern", () => {
    expect(formatDuration(45)).toBe("45 Min.");
    expect(formatDuration(60)).toBe("1 Std.");
    expect(formatDuration(90)).toBe("1 Std. 30 Min.");
    expect(formatDuration(0)).toBe("0 Min.");
  });

  it("Schnellauswahl ohne 150 Minuten, acht eindeutige Standard-Sportarten", () => {
    expect([...DURATION_PRESETS]).toEqual([30, 60, 90, 120]);
    expect(DEFAULT_ACTIVITY_TYPES).toHaveLength(8);
    expect(new Set(DEFAULT_ACTIVITY_TYPES.map((a) => a.name)).size).toBe(8);
  });

  it("Eingaben werden begrenzt", () => {
    const base = { activityTypeId: "x", performedAtLocal: "2026-11-16T18:00", timezone: "Europe/Berlin" };
    expect(activityEntryInputSchema.safeParse({ ...base, durationMin: 60 }).success).toBe(true);
    expect(activityEntryInputSchema.safeParse({ ...base, durationMin: 0 }).success).toBe(false);
    expect(activityEntryInputSchema.safeParse({ ...base, durationMin: 601 }).success).toBe(false);
    expect(activityEntryInputSchema.safeParse({ ...base, durationMin: 12.5 }).success).toBe(false);
    expect(activityEntryInputSchema.safeParse({ ...base, durationMin: 60, intensity: "EXTREM" }).success).toBe(false);
  });
});
