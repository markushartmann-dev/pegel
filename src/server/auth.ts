import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { env } from "./env";
import { audit } from "./audit";
import { sendMail } from "./mail";
import { isValidTimeZone } from "@/lib/dates";

/**
 * Authentifizierung mit Better Auth (aktiv gepflegt, Nachfolger von Auth.js-Empfehlung).
 *
 *  - Passwörter: scrypt-Hash in `account.password` (nie Klartext)
 *  - Sitzungen: zufällige Tokens in der Datenbank (Tabelle `session`), Cookie HttpOnly + SameSite=Lax,
 *    Secure in Produktion. Kein Cookie-Cache → Widerruf (Löschen der Zeile) wirkt sofort.
 *  - "Angemeldet bleiben": Cookie mit Max-Age = SESSION_MAX_AGE_DAYS, gleitende Verlängerung
 *    alle SESSION_UPDATE_AGE_HOURS. Ohne Häkchen: Browser-Sitzungscookie, serverseitig max. 24 h.
 *  - Neue Sitzung bei jedem Login (Schutz vor Session-Fixation), Widerruf bei Passwortänderung/-reset.
 *  - CSRF: Origin-Prüfung durch Better Auth + SameSite-Cookies.
 *  - Rate-Limits in der Datenbank (Login, Registrierung, Passwort-Reset).
 */

const FAILED_LOGIN_WINDOW_MIN = 15;
const FAILED_LOGIN_MAX = 8;

const trustedOrigins = [
  env.appUrl,
  ...(process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean),
];

export const auth = betterAuth({
  appName: "Pegel",
  baseURL: env.appUrl,
  secret: env.authSecret,
  trustedOrigins,
  telemetry: { enabled: false },
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: env.mailEnabled,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Pegel – Passwort zurücksetzen",
        text: `Hallo ${user.name},\n\nüber diesen Link kannst du innerhalb von 60 Minuten ein neues Passwort festlegen:\n${url}\n\nFalls du das nicht angefordert hast, ignoriere diese E-Mail.`,
      });
    },
    onPasswordReset: async ({ user }) => {
      await audit({ action: "auth.password_reset", severity: "SECURITY", actorId: user.id, targetUserId: user.id });
    },
  },

  emailVerification: {
    sendOnSignUp: env.mailEnabled,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Pegel – E-Mail-Adresse bestätigen",
        text: `Hallo ${user.name},\n\nbitte bestätige deine E-Mail-Adresse:\n${url}\n\nDer Link ist 24 Stunden gültig.`,
      });
    },
    afterEmailVerification: async (user) => {
      await audit({ action: "auth.email_verified", actorId: user.id, targetUserId: user.id });
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "USER" },
      status: { type: "string", input: false, defaultValue: "ACTIVE" },
      timezone: { type: "string", input: true, required: false, defaultValue: env.defaultTimezone },
      onboardingCompleted: { type: "boolean", input: false, defaultValue: false },
      themeMode: { type: "string", input: false, defaultValue: "SYSTEM" },
      colorScheme: { type: "string", input: false, defaultValue: "MIDNIGHT" },
    },
  },

  session: {
    expiresIn: env.sessionMaxAgeDays * 24 * 60 * 60,
    updateAge: env.sessionUpdateAgeHours * 60 * 60,
    cookieCache: { enabled: false },
  },

  account: {
    accountLinking: { enabled: false },
  },

  advanced: {
    useSecureCookies: env.cookieSecure,
    cookiePrefix: "pegel",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    // Hinter Cloudflare ist CF-Connecting-IP verlässlich; der erste X-Forwarded-For-Eintrag
    // kann vom Client vorgegeben werden und würde sonst Rate-Limits aushebeln.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"] },
  },

  rateLimit: {
    enabled: !env.disableAuthRateLimit,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 10 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 60 * 15, max: 10 },
      "/change-password": { window: 60 * 15, max: 10 },
      "/send-verification-email": { window: 60 * 60, max: 5 },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const count = await prisma.user.count();
          if (count > 0 && !env.registrationEnabled) {
            throw new APIError("FORBIDDEN", { message: "Die Registrierung ist derzeit deaktiviert." });
          }
          const tz = typeof user.timezone === "string" && isValidTimeZone(user.timezone) ? user.timezone : env.defaultTimezone;
          // Der erste Benutzer einer neuen Installation wird Administrator.
          return { data: { ...user, timezone: tz, role: count === 0 ? "ADMIN" : "USER", status: "ACTIVE" } };
        },
        after: async (user, ctx) => {
          await audit({
            action: "auth.register",
            actorId: user.id,
            targetUserId: user.id,
            headers: ctx?.headers ?? ctx?.request?.headers,
            metadata: { role: (user as { role?: string }).role },
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { status: true } });
          if (!user || user.status !== "ACTIVE") {
            throw new APIError("FORBIDDEN", { message: "Dieses Konto ist deaktiviert." });
          }
        },
        after: async (session, ctx) => {
          const now = new Date();
          await prisma.user.update({ where: { id: session.userId }, data: { lastLoginAt: now, lastActiveAt: now } });
          await audit({
            action: "auth.login",
            actorId: session.userId,
            targetUserId: session.userId,
            headers: ctx?.headers ?? ctx?.request?.headers,
          });
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").trim().toLowerCase();
        if (!email) return;
        const user = await prisma.user.findUnique({ where: { email }, select: { id: true, status: true } });
        if (!user) return;
        if (user.status !== "ACTIVE") {
          await audit({ action: "auth.login_blocked", severity: "SECURITY", targetUserId: user.id, headers: ctx.headers, metadata: { reason: "deactivated" } });
          throw new APIError("FORBIDDEN", { message: "Dieses Konto ist deaktiviert. Bitte wende dich an die Administration." });
        }
        // Schutz gegen Brute-Force pro Konto (zusätzlich zum IP-basierten Rate-Limit)
        const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MIN * 60_000);
        const failures = await prisma.auditLog.count({
          where: { action: "auth.login_failed", targetUserId: user.id, createdAt: { gte: since } },
        });
        if (failures >= FAILED_LOGIN_MAX) {
          await audit({ action: "auth.login_blocked", severity: "SECURITY", targetUserId: user.id, headers: ctx.headers, metadata: { reason: "too_many_failures" } });
          throw new APIError("TOO_MANY_REQUESTS", {
            message: `Zu viele fehlgeschlagene Anmeldeversuche. Bitte in ${FAILED_LOGIN_WINDOW_MIN} Minuten erneut versuchen.`,
          });
        }
      }
      if (ctx.path === "/sign-out") {
        const session = await getSessionFromCtx(ctx).catch(() => null);
        if (session?.user?.id) {
          await prisma.user.update({ where: { id: session.user.id }, data: { lastLogoutAt: new Date() } });
          await audit({ action: "auth.logout", actorId: session.user.id, targetUserId: session.user.id, headers: ctx.headers });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      const failed = returned instanceof APIError || (returned instanceof Response && !returned.ok);
      if (ctx.path === "/sign-in/email" && failed) {
        const status = returned instanceof APIError ? returned.statusCode : (returned as Response).status;
        if (status === 401) {
          const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").trim().toLowerCase();
          const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
          await audit({
            action: "auth.login_failed",
            severity: "SECURITY",
            targetUserId: user?.id ?? null,
            headers: ctx.headers,
            metadata: { knownAccount: !!user },
          });
        }
      }
      if (ctx.path === "/request-password-reset" && !failed) {
        const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").trim().toLowerCase();
        const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
        if (user) await audit({ action: "auth.password_reset_requested", severity: "SECURITY", targetUserId: user.id, headers: ctx.headers });
      }
      if (ctx.path === "/change-password" && !failed) {
        const session = ctx.context.session ?? ctx.context.newSession;
        const uid = session?.user?.id;
        if (uid) await audit({ action: "auth.password_changed", severity: "SECURITY", actorId: uid, targetUserId: uid, headers: ctx.headers });
      }
    }),
  },

  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
