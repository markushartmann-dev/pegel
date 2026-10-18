/**
 * Zeitzonen- und Zeitraum-Hilfsfunktionen.
 *
 * Grundsätze:
 *  - Gespeichert wird immer ein absoluter Zeitpunkt (UTC).
 *  - Ein "Tag" ist der Kalendertag in der Zeitzone des Benutzers (00:00 bis 00:00 lokal).
 *    An Tagen mit Zeitumstellung hat ein Tag daher 23 bzw. 25 Stunden.
 *  - Tage werden als Schlüssel "YYYY-MM-DD" behandelt.
 *  - Eingegebene lokale Zeitpunkte, die es wegen der Sommerzeitumstellung nicht gibt
 *    (z. B. 02:30 am letzten Sonntag im März), werden um die Lücke nach vorne verschoben.
 *    Doppelt vorkommende Zeitpunkte (Oktober) werden als erstes Vorkommen interpretiert.
 */

const DAY_MS = 86_400_000;

export function isValidTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string) {
  let f = partsFormatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsFormatterCache.set(tz, f);
  }
  return f;
}

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 1 = Montag … 7 = Sonntag */
  isoWeekday: number;
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function zonedParts(date: Date | number, tz: string): ZonedParts {
  const parts = partsFormatter(tz).formatToParts(typeof date === "number" ? new Date(date) : date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    isoWeekday: WEEKDAYS[get("weekday")] ?? 1,
  };
}

/** Offset der Zeitzone zum Zeitpunkt t in Millisekunden (lokal − UTC). */
export function tzOffsetMs(t: number, tz: string): number {
  const p = zonedParts(t, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(t / 1000) * 1000;
  return asUtc - truncated;
}

/** Lokale Wandzeit (in tz) → absoluter Zeitpunkt. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const local = Date.UTC(year, month - 1, day, hour, minute);
  const before = tzOffsetMs(local - DAY_MS, tz);
  const after = tzOffsetMs(local + DAY_MS, tz);
  const candidates = [...new Set([local - before, local - after])].filter(
    (t) => t + tzOffsetMs(t, tz) === local,
  );
  if (candidates.length > 0) return new Date(Math.min(...candidates));
  // Lücke (Sommerzeitbeginn): mit dem Offset vor der Umstellung rechnen → liegt nach der Lücke.
  return new Date(local - before);
}

const LOCAL_DT = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DDTHH:mm" in tz → Date. Gibt null bei ungültiger Eingabe zurück. */
export function parseLocalDateTime(value: string, tz: string): Date | null {
  const m = LOCAL_DT.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  // Kalenderdatum prüfen (z. B. 31.02.)
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return zonedTimeToUtc(y, mo, d, h, mi, tz);
}

/** Date → "YYYY-MM-DDTHH:mm" in tz (für <input type="datetime-local">). */
export function toLocalDateTimeInput(date: Date | number, tz: string): string {
  const p = zonedParts(date, tz);
  return `${dayKeyFromParts(p)}T${pad(p.hour)}:${pad(p.minute)}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dayKeyFromParts(p: { year: number; month: number; day: number }) {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Kalendertag (in tz) eines Zeitpunkts als "YYYY-MM-DD". */
export function dayKey(date: Date | number, tz: string): string {
  return dayKeyFromParts(zonedParts(date, tz));
}

export function isValidDayKey(key: string): boolean {
  const m = DAY_KEY.exec(key);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const check = new Date(Date.UTC(y, mo - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d;
}

function parseDayKey(key: string): [number, number, number] {
  if (!isValidDayKey(key)) throw new RangeError(`Ungültiges Datum: ${key}`);
  const [y, m, d] = key.split("-").map(Number);
  return [y, m, d];
}

/** Tagesschlüssel um n Tage verschieben (kalendarisch, unabhängig von Zeitumstellungen). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = parseDayKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dayKeyFromParts({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() });
}

/** Beginn des Kalendertags (00:00 lokal) als absoluter Zeitpunkt. */
export function startOfDay(key: string, tz: string): Date {
  const [y, m, d] = parseDayKey(key);
  return zonedTimeToUtc(y, m, d, 0, 0, tz);
}

/** Liste aller Tagesschlüssel von `from` bis einschließlich `to`. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let k = from;
  let guard = 0;
  while (k <= to && guard++ < 3700) {
    out.push(k);
    k = addDays(k, 1);
  }
  return out;
}

/** ISO-Woche "YYYY-Www" eines Tagesschlüssels. */
export function isoWeekKey(key: string): string {
  const [y, m, d] = parseDayKey(key);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}

export function monthKey(key: string): string {
  return key.slice(0, 7);
}

/** Montag der Woche, in der der Tag liegt. */
export function startOfIsoWeek(key: string): string {
  const [y, m, d] = parseDayKey(key);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
  return addDays(key, 1 - dow);
}

export function firstOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function lastOfMonth(key: string): string {
  const [y, m] = parseDayKey(firstOfMonth(key));
  const dt = new Date(Date.UTC(y, m, 0));
  return dayKeyFromParts({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() });
}

export function addMonths(key: string, n: number): string {
  const [y, m] = parseDayKey(firstOfMonth(key));
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return dayKeyFromParts({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: 1 });
}

export const PERIODS = ["today", "7d", "30d", "month", "prev-month", "custom"] as const;
export type Period = (typeof PERIODS)[number];

export interface PeriodRange {
  period: Period;
  /** erster Tag (inklusive) */
  fromDay: string;
  /** letzter Tag (inklusive) */
  toDay: string;
  /** absoluter Beginn (inklusive) */
  from: Date;
  /** absolutes Ende (exklusive) = Beginn des Folgetags */
  to: Date;
  days: string[];
}

export function makeRange(period: Period, fromDay: string, toDay: string, tz: string): PeriodRange {
  if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
  return {
    period,
    fromDay,
    toDay,
    from: startOfDay(fromDay, tz),
    to: startOfDay(addDays(toDay, 1), tz),
    days: daysBetween(fromDay, toDay),
  };
}

/**
 * Zeitraum relativ zu `now` in der Zeitzone tz.
 * "7d" und "30d" schließen den heutigen Tag ein.
 * "month" reicht vom Monatsersten bis heute, "prev-month" umfasst den kompletten Vormonat.
 */
export function periodRange(
  period: Period,
  now: Date,
  tz: string,
  custom?: { from?: string; to?: string },
): PeriodRange {
  const today = dayKey(now, tz);
  switch (period) {
    case "today":
      return makeRange(period, today, today, tz);
    case "7d":
      return makeRange(period, addDays(today, -6), today, tz);
    case "30d":
      return makeRange(period, addDays(today, -29), today, tz);
    case "month":
      return makeRange(period, firstOfMonth(today), today, tz);
    case "prev-month": {
      const first = addMonths(firstOfMonth(today), -1);
      return makeRange(period, first, lastOfMonth(first), tz);
    }
    case "custom": {
      const from = custom?.from && isValidDayKey(custom.from) ? custom.from : addDays(today, -6);
      let to = custom?.to && isValidDayKey(custom.to) ? custom.to : today;
      // Maximal ~10 Jahre, um Abfragen zu begrenzen
      if (daysDiff(from, to) > 3660) to = addDays(from, 3660);
      return makeRange(period, from, to, tz);
    }
  }
}

/** Gleich langer Zeitraum direkt davor (für Vergleiche). */
export function previousRange(range: PeriodRange, tz: string): PeriodRange {
  if (range.period === "month" || range.period === "prev-month") {
    const first = addMonths(range.fromDay, -1);
    const len = range.days.length;
    const last = addDays(first, len - 1);
    const cap = lastOfMonth(first);
    return makeRange(range.period, first, last < cap ? last : cap, tz);
  }
  const len = range.days.length;
  return makeRange(range.period, addDays(range.fromDay, -len), addDays(range.fromDay, -1), tz);
}

export function daysDiff(a: string, b: string): number {
  const [y1, m1, d1] = parseDayKey(a);
  const [y2, m2, d2] = parseDayKey(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS);
}

export function parsePeriod(value: string | undefined | null, fallback: Period = "7d"): Period {
  return (PERIODS as readonly string[]).includes(value ?? "") ? (value as Period) : fallback;
}

// ─── Formatierung (deutsch) ───────────────────────────────────────────────

export function formatDateTime(date: Date | number, tz: string): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatTime(date: Date | number, tz: string): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDayKey(key: string, style: "short" | "long" | "weekday" = "short"): string {
  const [y, m, d] = parseDayKey(key);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : style === "weekday"
        ? { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" }
        : { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" };
  return new Intl.DateTimeFormat("de-DE", opts).format(date);
}

export function formatMonthKey(key: string): string {
  const [y, m] = parseDayKey(firstOfMonth(key.length === 7 ? `${key}-01` : key));
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
}

/** Uhrzeit "HH:mm" validieren. */
export function isValidClock(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
