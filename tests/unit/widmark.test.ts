import { describe, expect, it } from "vitest";
import {
  buildTrajectory,
  distributionFactor,
  estimate,
  formatDuration,
  formatPromille,
  ProfileError,
  sampleCurve,
  validateProfile,
  valueAt,
  type BodyProfile,
} from "@/lib/calculations/widmark";

const H = 3_600_000;
const T0 = Date.UTC(2026, 5, 1, 18, 0); // 01.06.2026 20:00 MESZ
const male80: BodyProfile = { distributionModel: "WIDMARK_MALE", weightKg: 80, heightCm: 180 };
const instant = { betaPerHour: 0.15, absorptionMinutes: 0 };

describe("Verteilungsfaktor", () => {
  it("klassische Widmark-Werte", () => {
    expect(distributionFactor(male80)).toBe(0.68);
    expect(distributionFactor({ ...male80, distributionModel: "WIDMARK_FEMALE" })).toBe(0.55);
  });
  it("Seidl-Formel nutzt Gewicht und Größe", () => {
    const r = distributionFactor({ distributionModel: "SEIDL_MALE", weightKg: 80, heightCm: 180 });
    expect(r).toBeCloseTo(0.31608 - 0.004821 * 80 + 0.004632 * 180, 6);
    const rf = distributionFactor({ distributionModel: "SEIDL_FEMALE", weightKg: 60, heightCm: 165 });
    expect(rf).toBeCloseTo(0.31223 - 0.006446 * 60 + 0.004466 * 165, 6);
  });
  it("begrenzt Seidl-Ergebnisse auf 0,40–0,90", () => {
    expect(distributionFactor({ distributionModel: "SEIDL_FEMALE", weightKg: 300, heightCm: 120 })).toBe(0.4);
  });
  it("eigener Faktor", () => {
    expect(distributionFactor({ ...male80, distributionModel: "CUSTOM", customFactor: 0.6 })).toBe(0.6);
  });
});

describe("Profilvalidierung", () => {
  it.each([
    [null, "Kein Berechnungsprofil"],
    [{ distributionModel: "WIDMARK_MALE", heightCm: 180 }, "Körpergewicht fehlt"],
    [{ distributionModel: "WIDMARK_MALE", weightKg: 10, heightCm: 180 }, "außerhalb"],
    [{ distributionModel: "WIDMARK_MALE", weightKg: 80 }, "Körpergröße fehlt"],
    [{ weightKg: 80, heightCm: 180 }, "Berechnungsprofil fehlt"],
    [{ distributionModel: "CUSTOM", weightKg: 80, heightCm: 180 }, "Verteilungsfaktor"],
    [{ distributionModel: "CUSTOM", customFactor: 1.2, weightKg: 80, heightCm: 180 }, "Verteilungsfaktor"],
    [{ distributionModel: "WIDMARK_MALE", weightKg: Number.NaN, heightCm: 180 }, "Körpergewicht fehlt"],
  ])("lehnt %j ab", (profile, message) => {
    expect(() => validateProfile(profile as never)).toThrow(ProfileError);
    expect(() => validateProfile(profile as never)).toThrow(message);
  });

  it("estimate meldet fehlendes Profil statt eines Werts", () => {
    const res = estimate([{ at: T0, grams: 20 }], null, T0 + H);
    expect(res.status).toBe("unavailable");
  });
});

describe("Einzelnes Getränk (Grundgleichung)", () => {
  it("c = A/(r·m) − β·t bei sofortiger Aufnahme", () => {
    const A = 19.725;
    const traj = buildTrajectory([{ at: T0, grams: A }], 0.68, 80, instant);
    const c0 = A / (0.68 * 80);
    expect(valueAt(traj, T0)).toBeCloseTo(c0, 9);
    expect(valueAt(traj, T0 + H)).toBeCloseTo(c0 - 0.15, 9);
    expect(valueAt(traj, T0 + 0.5 * H)).toBeCloseTo(c0 - 0.075, 9);
    const zero = traj[traj.length - 1];
    expect(zero.promille).toBe(0);
    expect((zero.t - T0) / H).toBeCloseTo(c0 / 0.15, 9);
    // danach bleibt der Wert 0 (nie negativ)
    expect(valueAt(traj, T0 + 10 * H)).toBe(0);
  });

  it("lineare Resorption: Höchstwert am Ende der Resorptionsphase", () => {
    const A = 40;
    const params = { betaPerHour: 0.15, absorptionMinutes: 30 };
    const traj = buildTrajectory([{ at: T0, grams: A }], 0.68, 80, params);
    const total = A / (0.68 * 80);
    expect(valueAt(traj, T0 + 0.5 * H)).toBeCloseTo(total - 0.075, 9);
    expect(valueAt(traj, T0 + 0.25 * H)).toBeCloseTo(total / 2 - 0.0375, 9);
    // Gesamtdauer bis 0 ist identisch mit sofortiger Aufnahme (Masse bleibt erhalten)
    const end = traj[traj.length - 1].t;
    expect((end - T0) / H).toBeCloseTo(total / 0.15, 9);
  });

  it("kleine Mengen, die langsamer aufgenommen als abgebaut werden, bleiben bei 0", () => {
    const traj = buildTrajectory([{ at: T0, grams: 1 }], 0.68, 80, { betaPerHour: 0.15, absorptionMinutes: 60 });
    expect(Math.max(...traj.map((p) => p.promille))).toBe(0);
  });
});

describe("Mehrere Getränke", () => {
  it("addiert Beiträge und baut die Gesamtkonzentration linear ab", () => {
    const A = 19.725;
    const c = A / (0.68 * 80);
    const drinks = [
      { at: T0, grams: A },
      { at: T0 + H, grams: A },
    ];
    const traj = buildTrajectory(drinks, 0.68, 80, instant);
    expect(valueAt(traj, T0 + H)).toBeCloseTo(2 * c - 0.15, 9);
    expect(valueAt(traj, T0 + 2 * H)).toBeCloseTo(2 * c - 0.3, 9);
    const zeroH = (traj[traj.length - 1].t - T0) / H;
    expect(zeroH).toBeCloseTo((2 * c) / 0.15, 9);
  });

  it("ist unabhängig von der Reihenfolge der Eingabe", () => {
    const drinks = [
      { at: T0 + 2 * H, grams: 10 },
      { at: T0, grams: 20 },
      { at: T0 + H, grams: 15 },
    ];
    const a = buildTrajectory(drinks, 0.6, 70);
    const b = buildTrajectory([...drinks].sort((x, y) => x.at - y.at), 0.6, 70);
    expect(a).toEqual(b);
  });

  it("Getränk nach vollständigem Abbau beginnt wieder bei 0 (kein negativer Übertrag)", () => {
    const small = 5;
    const drinks = [
      { at: T0, grams: small },
      { at: T0 + 5 * H, grams: small },
    ];
    const traj = buildTrajectory(drinks, 0.68, 80, instant);
    expect(valueAt(traj, T0 + 4 * H)).toBe(0);
    expect(valueAt(traj, T0 + 5 * H)).toBeCloseTo(small / (0.68 * 80), 9);
    expect(traj.every((p) => p.promille >= 0)).toBe(true);
  });

  it("mehrere Portionen in kurzer Folge überlagern sich während der Resorption", () => {
    const params = { betaPerHour: 0.15, absorptionMinutes: 30 };
    const drinks = [0, 5, 10, 15].map((m) => ({ at: T0 + m * 60_000, grams: 13 }));
    const traj = buildTrajectory(drinks, 0.68, 80, params);
    const total = (4 * 13) / (0.68 * 80);
    const end = traj[traj.length - 1].t;
    expect((end - T0) / H).toBeCloseTo(total / 0.15, 6);
    const peak = Math.max(...traj.map((p) => p.promille));
    expect(peak).toBeLessThan(total);
    expect(peak).toBeGreaterThan(total - 0.15);
  });

  it("Getränke von vergangenen Tagen tragen nicht mehr bei", () => {
    const res = estimate([{ at: T0, grams: 40 }], male80, T0 + 48 * H);
    expect(res.status).toBe("zero");
  });
});

describe("Schätzung und Prognose", () => {
  it("liefert aktuellen Wert, Spanne und Nullzeitpunkt", () => {
    const res = estimate([{ at: T0, grams: 39.45 }], male80, T0 + H);
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    const c0 = 39.45 / (0.68 * 80);
    expect(res.current).toBeCloseTo(c0 - 0.15, 9);
    expect(res.currentRange.low).toBeLessThan(res.current);
    expect(res.currentRange.high).toBeGreaterThan(res.current);
    expect(res.zeroAt).not.toBeNull();
    expect(res.hoursToZero).toBeCloseTo((c0 - 0.15) / 0.15, 6);
    expect(res.zeroAtRange.earliest!).toBeLessThan(res.zeroAt!);
    expect(res.zeroAtRange.latest!).toBeGreaterThan(res.zeroAt!);
    expect(res.peak).toBeCloseTo(c0 - 0.075, 9);
    expect(res.flags).not.toContain("ABSORPTION_IN_PROGRESS");
  });

  it("markiert laufende Resorption und steigenden Wert", () => {
    const res = estimate([{ at: T0, grams: 30 }], male80, T0 + 10 * 60_000);
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.flags).toContain("ABSORPTION_IN_PROGRESS");
    expect(res.flags).toContain("STILL_RISING");
    expect(res.peakAt).toBeGreaterThan(res.now);
  });

  it("ignoriert zukünftige Einträge und markiert sie", () => {
    const res = estimate(
      [
        { at: T0, grams: 20 },
        { at: T0 + 5 * H, grams: 20 },
      ],
      male80,
      T0 + H,
    );
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.flags).toContain("FUTURE_ENTRIES_IGNORED");
    expect(res.drinksConsidered).toBe(1);
  });

  it("nur zukünftige Einträge → keine Prognose", () => {
    expect(estimate([{ at: T0 + 5 * H, grams: 20 }], male80, T0).status).toBe("no_data");
  });

  it("keine Daten → keine Prognose", () => {
    expect(estimate([], male80, T0).status).toBe("no_data");
    expect(estimate([{ at: T0, grams: 0 }], male80, T0 + 1).status).toBe("no_data");
  });

  it("bereits abgebaut → Status zero", () => {
    expect(estimate([{ at: T0, grams: 10 }], male80, T0 + 3 * H).status).toBe("zero");
  });

  it("markiert hohe Modellwerte", () => {
    const res = estimate([{ at: T0, grams: 150 }], male80, T0 + H);
    expect(res.status === "ok" && res.flags.includes("HIGH_VALUE")).toBe(true);
  });

  it("rechnet über die Zeitumstellung mit Realzeit", () => {
    // 26.10.2025: 03:00 MESZ → 02:00 MEZ (= 01:00 UTC)
    const switchUtc = Date.UTC(2025, 9, 26, 1, 0);
    const res = estimate([{ at: switchUtc - 30 * 60_000, grams: 30 }], male80, switchUtc + 30 * 60_000);
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.current).toBeCloseTo(30 / (0.68 * 80) - 0.15, 9);
  });
});

describe("Kurvenabtastung", () => {
  it("liefert Werte im Raster und ≥ 0", () => {
    const traj = buildTrajectory([{ at: T0, grams: 20 }], 0.68, 80);
    const s = sampleCurve(traj, T0 - H, T0 + 6 * H, 15);
    expect(s[0].promille).toBe(0);
    expect(s.length).toBe(7 * 4 + 1);
    expect(s.every((p) => p.promille >= 0)).toBe(true);
  });
});

describe("Formatierung (Rundung erst bei der Darstellung)", () => {
  it("Promille mit einer Nachkommastelle", () => {
    expect(formatPromille(0)).toBe("0,0 ‰");
    expect(formatPromille(-0.2)).toBe("0,0 ‰");
    expect(formatPromille(0.03)).toBe("< 0,1 ‰");
    expect(formatPromille(0.05)).toBe("0,1 ‰");
    expect(formatPromille(0.449)).toBe("0,4 ‰");
    expect(formatPromille(0.45)).toBe("0,5 ‰");
    expect(formatPromille(1.234)).toBe("1,2 ‰");
    expect(formatPromille(Number.NaN)).toBe("0,0 ‰");
  });
  it("Dauer auf 5 Minuten gerundet", () => {
    expect(formatDuration(0)).toBe("0 Min.");
    expect(formatDuration(0.01)).toBe("5 Min.");
    expect(formatDuration(2.5)).toBe("2 Std. 30 Min.");
    expect(formatDuration(3)).toBe("3 Std.");
    expect(formatDuration(1.99)).toBe("2 Std.");
  });
});

describe("Numerische Grenzfälle", () => {
  it("lehnt ungültige Parameter ab", () => {
    expect(() => buildTrajectory([{ at: T0, grams: 10 }], 0, 80)).toThrow();
    expect(() => buildTrajectory([{ at: T0, grams: 10 }], 0.68, 80, { betaPerHour: 0, absorptionMinutes: 0 })).toThrow();
  });
  it("ignoriert ungültige Getränkedaten", () => {
    const traj = buildTrajectory(
      [
        { at: Number.NaN, grams: 10 },
        { at: T0, grams: -5 },
        { at: T0, grams: Number.POSITIVE_INFINITY },
      ],
      0.68,
      80,
    );
    expect(traj).toEqual([]);
  });
  it("sehr viele Einträge bleiben stabil", () => {
    const drinks = Array.from({ length: 500 }, (_, i) => ({ at: T0 + i * 10 * 60_000, grams: 2 }));
    const traj = buildTrajectory(drinks, 0.68, 80);
    expect(traj.every((p) => Number.isFinite(p.promille) && p.promille >= 0)).toBe(true);
    expect(traj[traj.length - 1].promille).toBe(0);
  });
});
