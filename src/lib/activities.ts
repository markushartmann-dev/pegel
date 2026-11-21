/**
 * Sport-Tracking: Standard-Sportarten, Grenzen und reine Auswertungsfunktionen (ohne Datenbankzugriff).
 *
 * Grundsatz: Sport wird nicht mit Alkohol verrechnet. Die Promille-Schätzung bleibt unverändert,
 * es gibt keine Kalorien- oder „Abtrainieren“-Rechnung.
 */
import { dayKey } from "./dates";

export const INTENSITIES = ["LIGHT", "MODERATE", "VIGOROUS"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const INTENSITY_LABELS: Record<Intensity, string> = { LIGHT: "leicht", MODERATE: "mittel", VIGOROUS: "intensiv" };

export const ACTIVITY_ICONS = ["run", "bike", "hike", "strength", "swim", "ball", "yoga", "other"] as const;
export type ActivityIconKey = (typeof ACTIVITY_ICONS)[number];

/** Schnellauswahl beim Erfassen; andere Werte über die freie Eingabe. */
export const DURATION_PRESETS = [30, 60, 90, 120] as const;
export const DURATION_LIMITS = { min: 1, max: 600 } as const;

/**
 * WHO-Empfehlung für Erwachsene: mindestens 150 Minuten mittlere oder 75 Minuten intensive
 * Bewegung pro Woche (oder eine Kombination). Intensive Minuten zählen deshalb doppelt,
 * leichte Bewegung zählt nicht zum Richtwert.
 */
export const WHO_WEEKLY_MINUTES = 150;

export interface DefaultActivityType {
  name: string;
  description: string;
  icon: ActivityIconKey;
  defaultIntensity: Intensity;
}

export const DEFAULT_ACTIVITY_TYPES: readonly DefaultActivityType[] = [
  { name: "Laufen", description: "Joggen, Dauerlauf, Intervalle", icon: "run", defaultIntensity: "VIGOROUS" },
  { name: "Radfahren", description: "Rad, E-Bike, Spinning", icon: "bike", defaultIntensity: "MODERATE" },
  { name: "Spazieren/Wandern", description: "Zügiges Gehen, Wandern", icon: "hike", defaultIntensity: "MODERATE" },
  { name: "Krafttraining/Fitness", description: "Studio, Kurse, Training zu Hause", icon: "strength", defaultIntensity: "MODERATE" },
  { name: "Schwimmen", description: "Bahnen, Aquafitness", icon: "swim", defaultIntensity: "MODERATE" },
  { name: "Ballsport", description: "Fußball, Tennis, Basketball …", icon: "ball", defaultIntensity: "VIGOROUS" },
  { name: "Yoga/Pilates", description: "Yoga, Pilates, Dehnen", icon: "yoga", defaultIntensity: "LIGHT" },
  { name: "Sonstiges", description: "Alles andere", icon: "other", defaultIntensity: "MODERATE" },
];

export function isIntensity(v: unknown): v is Intensity {
  return typeof v === "string" && (INTENSITIES as readonly string[]).includes(v);
}

/** Minuten, die zum WHO-Richtwert zählen: mittel × 1, intensiv × 2, leicht × 0. */
export function whoMinutes(durationMin: number, intensity: Intensity): number {
  return intensity === "VIGOROUS" ? durationMin * 2 : intensity === "MODERATE" ? durationMin : 0;
}

export interface ActivityStatEntry {
  performedAt: Date;
  durationMin: number;
  intensity: Intensity;
  activityName: string;
  timezone?: string;
}

export interface ActivitySummary {
  sessions: number;
  minutes: number;
  /** nach Intensität aufgeteilt */
  byIntensity: Record<Intensity, number>;
  /** zum WHO-Richtwert zählende Minuten */
  whoMinutes: number;
  /** Anteil am Richtwert (0 … ∞, für die Anzeige auf 1 begrenzen) */
  whoShare: number;
  activeDays: number;
}

export function summarizeActivities(entries: readonly ActivityStatEntry[], tz: string): ActivitySummary {
  const byIntensity: Record<Intensity, number> = { LIGHT: 0, MODERATE: 0, VIGOROUS: 0 };
  const days = new Set<string>();
  let minutes = 0;
  let who = 0;
  for (const e of entries) {
    minutes += e.durationMin;
    byIntensity[e.intensity] += e.durationMin;
    who += whoMinutes(e.durationMin, e.intensity);
    days.add(dayKey(e.performedAt, e.timezone || tz));
  }
  return { sessions: entries.length, minutes, byIntensity, whoMinutes: who, whoShare: who / WHO_WEEKLY_MINUTES, activeDays: days.size };
}

/** Minuten pro Kalendertag (für Kalender und Diagramme). */
export function activityMinutesByDay(entries: readonly ActivityStatEntry[], tz: string): Map<string, { minutes: number; sessions: number }> {
  const map = new Map<string, { minutes: number; sessions: number }>();
  for (const e of entries) {
    const k = dayKey(e.performedAt, e.timezone || tz);
    const v = map.get(k) ?? { minutes: 0, sessions: 0 };
    v.minutes += e.durationMin;
    v.sessions += 1;
    map.set(k, v);
  }
  return map;
}

/** „45 Min.“, „1 Std.“, „1 Std. 30 Min.“ */
export function formatDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} Min.`;
  return rest ? `${h} Std. ${rest} Min.` : `${h} Std.`;
}
