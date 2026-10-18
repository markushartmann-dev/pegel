/**
 * Vereinfachtes, zeitabhängiges Widmark-Modell.
 *
 * Grundgleichung (ein Getränk, sofortige Aufnahme):
 *     c(t) = A / (r × m) − β × t
 *
 * Erweiterung für mehrere Getränke (siehe docs/BERECHNUNG.md):
 *  1. Jedes Getränk i liefert den Beitrag  Δc_i = A_i / (r × m)  [‰].
 *  2. Dieser Beitrag wird linear über die Resorptionsdauer D ab dem Konsumzeitpunkt
 *     aufgenommen (Rate Δc_i / D). D = 0 bedeutet sofortige Aufnahme.
 *  3. Abgebaut wird mit konstanter Rate β (Kinetik 0. Ordnung) – aber nur,
 *     solange der Modellwert > 0 ist. Der Abbau wirkt auf die Gesamtkonzentration,
 *     nicht je Getränk; negative Werte werden auf 0 begrenzt.
 *
 * Weil Aufnahme- und Abbauraten stückweise konstant sind, ist der Verlauf stückweise
 * linear. Er wird exakt (ohne numerische Integration) als Liste von Stützstellen berechnet.
 *
 * Alle Zeiten sind Millisekunden seit Epoch (UTC). Zeitzonen spielen für das Modell
 * keine Rolle – erst die Darstellung rechnet in die lokale Zeit um.
 */

export type DistributionModel =
  | "WIDMARK_MALE"
  | "WIDMARK_FEMALE"
  | "SEIDL_MALE"
  | "SEIDL_FEMALE"
  | "CUSTOM";

export interface BodyProfile {
  distributionModel: DistributionModel;
  weightKg: number;
  heightCm: number;
  customFactor?: number | null;
}

export interface ModelParams {
  /** Abbaurate β in ‰ pro Stunde */
  betaPerHour: number;
  /** Resorptionsdauer in Minuten (lineare Aufnahme) */
  absorptionMinutes: number;
}

export interface DrinkEvent {
  /** Konsumzeitpunkt in ms (UTC) */
  at: number;
  /** Gramm reinen Alkohols */
  grams: number;
}

export const DEFAULT_MODEL_PARAMS: ModelParams = { betaPerHour: 0.15, absorptionMinutes: 30 };

/** Spanne, mit der die Unsicherheit der Annahmen sichtbar gemacht wird. */
export const UNCERTAINTY = {
  factorDeviation: 0.1, // r ± 10 %
  betaLow: 0.1, // ‰/h – langsamer Abbau
  betaHigh: 0.2, // ‰/h – schneller Abbau
} as const;

export const PROFILE_LIMITS = {
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 120, max: 230 },
  factor: { min: 0.4, max: 0.9 },
} as const;

const HOUR_MS = 3_600_000;

export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileError";
  }
}

/** Validiert ein Profil und liefert eine sprechende Fehlermeldung. */
export function validateProfile(profile: Partial<BodyProfile> | null | undefined): asserts profile is BodyProfile {
  if (!profile) throw new ProfileError("Kein Berechnungsprofil vorhanden.");
  const { weightKg, heightCm, distributionModel } = profile;
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg)) throw new ProfileError("Körpergewicht fehlt.");
  if (weightKg < PROFILE_LIMITS.weightKg.min || weightKg > PROFILE_LIMITS.weightKg.max) {
    throw new ProfileError("Körpergewicht liegt außerhalb des unterstützten Bereichs (30–300 kg).");
  }
  if (typeof heightCm !== "number" || !Number.isFinite(heightCm)) throw new ProfileError("Körpergröße fehlt.");
  if (heightCm < PROFILE_LIMITS.heightCm.min || heightCm > PROFILE_LIMITS.heightCm.max) {
    throw new ProfileError("Körpergröße liegt außerhalb des unterstützten Bereichs (120–230 cm).");
  }
  if (!distributionModel) throw new ProfileError("Berechnungsprofil fehlt.");
  if (distributionModel === "CUSTOM") {
    const f = profile.customFactor;
    if (typeof f !== "number" || !Number.isFinite(f) || f < PROFILE_LIMITS.factor.min || f > PROFILE_LIMITS.factor.max) {
      throw new ProfileError("Eigener Verteilungsfaktor muss zwischen 0,40 und 0,90 liegen.");
    }
  }
}

/**
 * Verteilungsfaktor r.
 *  - Widmark (klassisch): 0,68 bzw. 0,55
 *  - Seidl et al. (2000), berücksichtigt Gewicht und Größe:
 *      männlich: r = 0,31608 − 0,004821 × m + 0,004632 × h
 *      weiblich: r = 0,31223 − 0,006446 × m + 0,004466 × h
 *    Das Ergebnis wird auf den plausiblen Bereich 0,40–0,90 begrenzt.
 *  - Eigener Faktor: vom Benutzer gewählt (0,40–0,90)
 */
export function distributionFactor(profile: BodyProfile): number {
  validateProfile(profile);
  const { weightKg: m, heightCm: h } = profile;
  let r: number;
  switch (profile.distributionModel) {
    case "WIDMARK_MALE":
      r = 0.68;
      break;
    case "WIDMARK_FEMALE":
      r = 0.55;
      break;
    case "SEIDL_MALE":
      r = 0.31608 - 0.004821 * m + 0.004632 * h;
      break;
    case "SEIDL_FEMALE":
      r = 0.31223 - 0.006446 * m + 0.004466 * h;
      break;
    case "CUSTOM":
      r = profile.customFactor as number;
      break;
    default:
      throw new ProfileError("Unbekanntes Berechnungsprofil.");
  }
  return Math.min(PROFILE_LIMITS.factor.max, Math.max(PROFILE_LIMITS.factor.min, r));
}

/** Stützstelle eines stückweise linearen Verlaufs. */
export interface CurvePoint {
  t: number;
  promille: number;
}

/**
 * Berechnet den exakten, stückweise linearen Verlauf für eine Liste von Getränken.
 * Rückgabe: Stützstellen, zwischen denen linear interpoliert wird. Die letzte Stützstelle
 * hat stets den Wert 0 (Modellwert erreicht 0,0 ‰), sofern Getränke vorhanden sind.
 */
export function buildTrajectory(
  drinks: readonly DrinkEvent[],
  r: number,
  weightKg: number,
  params: ModelParams = DEFAULT_MODEL_PARAMS,
): CurvePoint[] {
  if (!(r > 0) || !(weightKg > 0)) throw new ProfileError("Ungültiger Verteilungsfaktor oder Gewicht.");
  if (!(params.betaPerHour > 0)) throw new RangeError("β muss größer als 0 sein.");
  if (!(params.absorptionMinutes >= 0)) throw new RangeError("Resorptionsdauer darf nicht negativ sein.");

  const valid = drinks.filter((d) => Number.isFinite(d.at) && Number.isFinite(d.grams) && d.grams > 0);
  if (valid.length === 0) return [];

  const betaPerMs = params.betaPerHour / HOUR_MS;
  const durationMs = params.absorptionMinutes * 60_000;

  // Aufnahme-Ereignisse: Rate ändert sich zu Beginn und Ende jeder Resorptionsphase.
  type Change = { t: number; rate: number; jump: number };
  const changes: Change[] = [];
  for (const d of valid) {
    const amount = d.grams / (r * weightKg); // ‰
    if (durationMs === 0) {
      changes.push({ t: d.at, rate: 0, jump: amount });
    } else {
      const rate = amount / durationMs; // ‰ pro ms
      changes.push({ t: d.at, rate, jump: 0 });
      changes.push({ t: d.at + durationMs, rate: -rate, jump: 0 });
    }
  }
  changes.sort((a, b) => a.t - b.t);

  const points: CurvePoint[] = [];
  let c = 0;
  let inputRate = 0;
  let t = changes[0].t;
  points.push({ t, promille: 0 });

  const advance = (until: number) => {
    let h = until - t;
    while (h > 0) {
      if (c > 0) {
        const net = inputRate - betaPerMs;
        if (net >= 0) {
          c += net * h;
          t += h;
          h = 0;
        } else {
          const toZero = c / -net;
          if (toZero >= h) {
            c += net * h;
            t += h;
            h = 0;
          } else {
            t += toZero;
            h -= toZero;
            c = 0;
            points.push({ t, promille: 0 });
          }
        }
      } else {
        // c == 0: steigt nur, wenn die Aufnahme den Abbau übersteigt
        if (inputRate > betaPerMs) {
          c = (inputRate - betaPerMs) * h;
        }
        t += h;
        h = 0;
      }
    }
    if (c < 1e-12) c = 0;
    points.push({ t, promille: c });
  };

  for (const ch of changes) {
    if (ch.t > t) advance(ch.t);
    inputRate += ch.rate;
    if (Math.abs(inputRate) < 1e-18) inputRate = 0;
    if (ch.jump > 0) {
      c += ch.jump;
      points.push({ t, promille: c });
    }
  }

  // Nach der letzten Aufnahme: reiner Abbau bis 0.
  if (c > 0) {
    const zeroAt = t + c / betaPerMs;
    points.push({ t: zeroAt, promille: 0 });
  }
  return dedupePoints(points);
}

function dedupePoints(points: CurvePoint[]): CurvePoint[] {
  const out: CurvePoint[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.t === p.t) {
      // Bei Sprüngen (sofortige Aufnahme) beide Werte behalten, sonst überschreiben.
      if (last.promille === p.promille) continue;
      if (out.length >= 2 && out[out.length - 2].t === p.t) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

/** Modellwert zu einem Zeitpunkt (lineare Interpolation zwischen den Stützstellen). */
export function valueAt(points: readonly CurvePoint[], t: number): number {
  if (points.length === 0 || t < points[0].t) return 0;
  const last = points[points.length - 1];
  if (t >= last.t) return last.promille;
  // binäre Suche nach dem letzten Punkt mit p.t <= t
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (points[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = points[lo];
  const b = points[lo + 1];
  if (!b || b.t === a.t) return a.promille;
  return a.promille + ((b.promille - a.promille) * (t - a.t)) / (b.t - a.t);
}

/** Abgetasteter Verlauf für Diagramme. */
export function sampleCurve(points: readonly CurvePoint[], from: number, to: number, stepMinutes = 10): CurvePoint[] {
  if (to <= from) return [];
  const step = Math.max(1, stepMinutes) * 60_000;
  const out: CurvePoint[] = [];
  for (let t = from; t <= to; t += step) out.push({ t, promille: valueAt(points, t) });
  if (out[out.length - 1]?.t !== to) out.push({ t: to, promille: valueAt(points, to) });
  return out;
}

export type EstimateFlag =
  | "ABSORPTION_IN_PROGRESS"
  | "FUTURE_ENTRIES_IGNORED"
  | "HIGH_VALUE"
  | "CUSTOM_FACTOR"
  | "STILL_RISING";

export type Estimate =
  | { status: "unavailable"; reason: string }
  | { status: "no_data" }
  | { status: "zero"; lastDrinkAt: number; factor: number }
  | {
      status: "ok";
      now: number;
      /** Modellwert (ungerundet) */
      current: number;
      /** Spanne aus abweichenden Annahmen (r ± 10 %, β 0,10–0,20 ‰/h) */
      currentRange: { low: number; high: number };
      peak: number;
      peakAt: number;
      /** Zeitpunkt, an dem der Modellwert rechnerisch 0 erreicht (null, wenn bereits 0) */
      zeroAt: number | null;
      zeroAtRange: { earliest: number | null; latest: number | null };
      /** Stunden bis 0,0 ‰ (0, wenn bereits erreicht) */
      hoursToZero: number;
      factor: number;
      params: ModelParams;
      flags: EstimateFlag[];
      trajectory: CurvePoint[];
      drinksConsidered: number;
    };

const FUTURE_TOLERANCE_MS = 60_000;
export const HIGH_VALUE_THRESHOLD = 2.0;

/**
 * Schätzung für den Zeitpunkt `now`. Getränke nach `now` (mit 1 Minute Toleranz)
 * werden ignoriert und markiert; sie fließen nicht in den aktuellen Wert ein.
 */
export function estimate(
  drinks: readonly DrinkEvent[],
  profile: BodyProfile | null | undefined,
  now: number,
  params: ModelParams = DEFAULT_MODEL_PARAMS,
): Estimate {
  let factor: number;
  try {
    validateProfile(profile);
    factor = distributionFactor(profile);
  } catch (e) {
    return { status: "unavailable", reason: e instanceof Error ? e.message : "Profil ungültig." };
  }

  const flags = new Set<EstimateFlag>();
  const past = drinks.filter((d) => {
    if (d.at > now + FUTURE_TOLERANCE_MS) {
      flags.add("FUTURE_ENTRIES_IGNORED");
      return false;
    }
    return d.grams > 0;
  });
  if (past.length === 0) return { status: "no_data" };

  const weight = profile.weightKg;
  const trajectory = buildTrajectory(past, factor, weight, params);
  const current = valueAt(trajectory, now);
  const end = trajectory[trajectory.length - 1];
  const zeroAt = end && end.t > now ? end.t : null;

  if (current === 0 && zeroAt === null) {
    return { status: "zero", lastDrinkAt: Math.max(...past.map((d) => d.at)), factor };
  }

  const absorptionMs = params.absorptionMinutes * 60_000;
  if (past.some((d) => d.at <= now && now < d.at + absorptionMs)) flags.add("ABSORPTION_IN_PROGRESS");
  if (valueAt(trajectory, now + 60_000) > current) flags.add("STILL_RISING");
  if (profile.distributionModel === "CUSTOM") flags.add("CUSTOM_FACTOR");

  let peak = 0;
  let peakAt = trajectory[0].t;
  for (const p of trajectory) {
    if (p.t <= now && p.promille > peak) {
      peak = p.promille;
      peakAt = p.t;
    }
  }
  // Bei noch laufender Resorption kann der Höchstwert in der Zukunft liegen.
  for (const p of trajectory) {
    if (p.t > now && p.promille > peak) {
      peak = p.promille;
      peakAt = p.t;
    }
  }
  if (peak >= HIGH_VALUE_THRESHOLD || current >= HIGH_VALUE_THRESHOLD) flags.add("HIGH_VALUE");

  const lowTraj = buildTrajectory(past, factor * (1 + UNCERTAINTY.factorDeviation), weight, {
    ...params,
    betaPerHour: UNCERTAINTY.betaHigh,
  });
  const highTraj = buildTrajectory(past, factor * (1 - UNCERTAINTY.factorDeviation), weight, {
    ...params,
    betaPerHour: UNCERTAINTY.betaLow,
  });
  const lowEnd = lowTraj[lowTraj.length - 1];
  const highEnd = highTraj[highTraj.length - 1];

  return {
    status: "ok",
    now,
    current,
    currentRange: { low: valueAt(lowTraj, now), high: valueAt(highTraj, now) },
    peak,
    peakAt,
    zeroAt,
    zeroAtRange: {
      earliest: lowEnd && lowEnd.t > now ? lowEnd.t : null,
      latest: highEnd && highEnd.t > now ? highEnd.t : null,
    },
    hoursToZero: zeroAt ? (zeroAt - now) / HOUR_MS : 0,
    factor,
    params,
    flags: [...flags],
    trajectory,
    drinksConsidered: past.length,
  };
}

/**
 * Darstellung eines Modellwerts mit einer Nachkommastelle. Werte zwischen 0 und 0,05 ‰
 * werden als "< 0,1 ‰" angezeigt, um keine Scheingenauigkeit zu suggerieren.
 */
export function formatPromille(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0,0 ‰";
  if (value < 0.05) return "< 0,1 ‰";
  return `${(Math.round(value * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ‰`;
}

/** Dauer in "x Std. y Min." (auf 5 Minuten gerundet, weil genauer nicht sinnvoll). */
export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0 Min.";
  const totalMin = Math.max(5, Math.round((hours * 60) / 5) * 5);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}
