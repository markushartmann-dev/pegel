import "server-only";
import { isValidTimeZone } from "@/lib/dates";

/**
 * Zentrale, validierte Server-Konfiguration aus Umgebungsvariablen.
 * Secrets werden ausschließlich aus der Umgebung gelesen, nie aus dem Quellcode.
 */
function num(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`Umgebungsvariable ${name} ist ungültig (erlaubt: ${min}–${max}).`);
  }
  return n;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on", "ja"].includes(raw);
}

const isProduction = process.env.NODE_ENV === "production";
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function secret(): string {
  const s = process.env.AUTH_SECRET ?? "";
  if (s.length < 32) {
    if (isBuild) return "build-time-placeholder-secret-not-used-at-runtime";
    throw new Error("AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen. Siehe README → Konfiguration.");
  }
  return s;
}

const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const defaultTz = process.env.DEFAULT_TIMEZONE && isValidTimeZone(process.env.DEFAULT_TIMEZONE)
  ? process.env.DEFAULT_TIMEZONE
  : "Europe/Berlin";

export const env = {
  isProduction,
  appUrl,
  get authSecret() {
    return secret();
  },
  /** Secure-Cookies: Standard in Produktion; nur bewusst per COOKIE_SECURE=false abschaltbar. */
  cookieSecure: bool("COOKIE_SECURE", appUrl.startsWith("https://")),
  sessionMaxAgeDays: num("SESSION_MAX_AGE_DAYS", 30, 1, 365),
  sessionUpdateAgeHours: num("SESSION_UPDATE_AGE_HOURS", 24, 1, 24 * 30),
  registrationEnabled: bool("REGISTRATION_ENABLED", true),
  defaultTimezone: defaultTz,
  model: {
    betaPerHour: num("MODEL_BETA_PER_HOUR", 0.15, 0.05, 0.4),
    absorptionMinutes: num("MODEL_ABSORPTION_MINUTES", 30, 0, 180),
  },
  /** Sparschwein: Euro pro Tag ohne Eintrag, Bonus pro voller Woche am Stück, Bonus pro komplettem Monat */
  savings: {
    perDay: num("SAVINGS_PER_DAY", 5, 0, 1000),
    weekBonus: num("SAVINGS_WEEK_BONUS", 10, 0, 1000),
    monthBonus: num("SAVINGS_MONTH_BONUS", 20, 0, 10000),
  },
  /** Angaben für Impressum und Datenschutzhinweise (nur in .env, nicht im Quellcode) */
  imprint: {
    name: process.env.IMPRINT_NAME?.trim() ?? "",
    street: process.env.IMPRINT_STREET?.trim() ?? "",
    city: process.env.IMPRINT_CITY?.trim() ?? "",
    country: process.env.IMPRINT_COUNTRY?.trim() ?? "",
    email: process.env.IMPRINT_EMAIL?.trim() ?? "",
    phone: process.env.IMPRINT_PHONE?.trim() ?? "",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: num("SMTP_PORT", 587, 1, 65535),
    secure: bool("SMTP_SECURE", false),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    from: process.env.SMTP_FROM ?? "Pegel <noreply@localhost>",
  },
  get mailEnabled() {
    return !!this.smtp.host;
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    subject: process.env.VAPID_SUBJECT ?? "mailto:admin@localhost",
  },
  get pushEnabled() {
    return !!(this.vapid.publicKey && this.vapid.privateKey);
  },
  /** Hintergrundjobs (Erinnerungen) – in Tests deaktiviert */
  schedulerEnabled: bool("SCHEDULER_ENABLED", true),
  /** Nur in E2E-Tests: deaktiviert die Rate-Limits von Better Auth */
  disableAuthRateLimit: bool("DISABLE_AUTH_RATE_LIMIT", false),
};
