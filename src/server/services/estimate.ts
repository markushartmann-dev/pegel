import "server-only";
import { env } from "../env";
import type { CurrentUser } from "../current-user";
import { estimate, sampleCurve, buildTrajectory, distributionFactor, validateProfile, type Estimate } from "@/lib/calculations/widmark";
import { addDays, startOfDay } from "@/lib/dates";
import { entriesBetween } from "./entries";
import { getBodyProfile, getBodyProfileAt } from "./profile";

const LOOKBACK_MS = 72 * 3_600_000;

export type EstimateDTO =
  | { status: "unavailable"; reason: string }
  | { status: "no_data" }
  | { status: "zero"; lastDrinkAt: string }
  | {
      status: "ok";
      now: string;
      current: number;
      currentRange: { low: number; high: number };
      peak: number;
      peakAt: string;
      zeroAt: string | null;
      zeroAtRange: { earliest: string | null; latest: string | null };
      hoursToZero: number;
      factor: number;
      params: { betaPerHour: number; absorptionMinutes: number };
      flags: string[];
      curve: { t: string; promille: number }[];
      drinksConsidered: number;
    };

const iso = (t: number | null) => (t === null ? null : new Date(t).toISOString());

export function serializeEstimate(e: Estimate): EstimateDTO {
  if (e.status === "unavailable") return e;
  if (e.status === "no_data") return e;
  if (e.status === "zero") return { status: "zero", lastDrinkAt: new Date(e.lastDrinkAt).toISOString() };
  const start = Math.max(e.trajectory[0]?.t ?? e.now, e.now - 12 * 3_600_000);
  const end = Math.max(e.zeroAt ?? e.now, e.now) + 30 * 60_000;
  const span = end - start;
  const step = Math.max(5, Math.ceil(span / 60_000 / 120 / 5) * 5); // ~120 Punkte
  return {
    status: "ok",
    now: new Date(e.now).toISOString(),
    current: e.current,
    currentRange: e.currentRange,
    peak: e.peak,
    peakAt: new Date(e.peakAt).toISOString(),
    zeroAt: iso(e.zeroAt),
    zeroAtRange: { earliest: iso(e.zeroAtRange.earliest), latest: iso(e.zeroAtRange.latest) },
    hoursToZero: e.hoursToZero,
    factor: e.factor,
    params: e.params,
    flags: e.flags,
    curve: sampleCurve(e.trajectory, start, end, step).map((p) => ({ t: new Date(p.t).toISOString(), promille: p.promille })),
    drinksConsidered: e.drinksConsidered,
  };
}

/** Aktuelle Schätzung auf Basis der Einträge der letzten 72 Stunden. */
export async function currentEstimate(user: CurrentUser, now = new Date()): Promise<EstimateDTO> {
  const profile = await getBodyProfile(user.id);
  const rows = await entriesBetween(user.id, new Date(now.getTime() - LOOKBACK_MS), new Date(now.getTime() + 24 * 3_600_000));
  const drinks = rows.map((r) => ({ at: r.consumedAt.getTime(), grams: Number(r.alcoholGrams) }));
  return serializeEstimate(estimate(drinks, profile, now.getTime(), env.model));
}

/**
 * Modellverlauf eines vergangenen Kalendertags mit dem damals gültigen Profil.
 * Berücksichtigt Getränke ab 24 h vor Tagesbeginn (Restalkohol vom Vortag).
 */
export async function dayCurve(user: CurrentUser, day: string) {
  const tz = user.timezone;
  const from = startOfDay(day, tz);
  const to = startOfDay(addDays(day, 1), tz);
  const profile = await getBodyProfileAt(user.id, to);
  if (!profile) return { status: "unavailable" as const };
  try {
    validateProfile(profile);
  } catch {
    return { status: "unavailable" as const };
  }
  const rows = await entriesBetween(user.id, new Date(from.getTime() - 24 * 3_600_000), to);
  if (rows.length === 0) return { status: "no_data" as const };
  const r = distributionFactor(profile);
  const traj = buildTrajectory(
    rows.map((x) => ({ at: x.consumedAt.getTime(), grams: Number(x.alcoholGrams) })),
    r,
    profile.weightKg,
    env.model,
  );
  const end = Math.min(Math.max(to.getTime(), traj[traj.length - 1]?.t ?? to.getTime()), to.getTime() + 12 * 3_600_000);
  const curve = sampleCurve(traj, from.getTime(), Math.min(end, Date.now()), 15);
  const peak = Math.max(0, ...curve.map((p) => p.promille));
  return {
    status: "ok" as const,
    peak,
    curve: curve.map((p) => ({ t: new Date(p.t).toISOString(), promille: p.promille })),
  };
}
