import "server-only";
import { verifyPassword } from "better-auth/crypto";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict } from "../errors";
import type { CurrentUser } from "../current-user";
import { deleteAccountSchema, settingsSchema } from "@/lib/validation";

export async function updateSettings(user: CurrentUser, raw: unknown, headers?: Headers) {
  const input = settingsSchema.parse(raw);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: input,
    select: { name: true, timezone: true, themeMode: true, colorScheme: true },
  });
  await audit({ action: "settings.updated", actorId: user.id, targetUserId: user.id, headers, metadata: { fields: Object.keys(input) } });
  return updated;
}

/** Vollständiger Datenexport (Art. 15/20 DSGVO) als JSON. Enthält keine Passwort-Hashes oder Tokens. */
export async function exportAccount(user: CurrentUser, headers?: Headers) {
  const data = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      lastLogoutAt: true,
      profileUpdatedAt: true,
      timezone: true,
      themeMode: true,
      colorScheme: true,
      notificationsEnabled: true,
      reminderEnabled: true,
      reminderTime: true,
      weeklySummaryEnabled: true,
      communityOptIn: true,
      communityDisplay: true,
      communityPseudonym: true,
      profile: true,
      profileRevisions: { orderBy: { validFrom: "asc" } },
      beverages: true,
      entries: { orderBy: { consumedAt: "asc" } },
      consents: { orderBy: { createdAt: "asc" } },
      sessions: { select: { createdAt: true, updatedAt: true, expiresAt: true, userAgent: true } },
      pushSubscriptions: { select: { createdAt: true, userAgent: true, lastUsedAt: true } },
      notifications: { select: { type: true, title: true, createdAt: true } },
      auditLogs: { select: { createdAt: true, action: true, severity: true }, orderBy: { createdAt: "asc" } },
    },
  });
  await audit({ action: "account.exported", actorId: user.id, targetUserId: user.id, headers });
  return { exportedAt: new Date().toISOString(), format: "pegel-export-v1", data };
}

/**
 * Löscht das eigene Konto inkl. Profil, Getränken, Einträgen, Sitzungen und Push-Abos (Cascade).
 * Protokolleinträge bleiben ohne Personenbezug erhalten (actorId/targetUserId → NULL).
 */
export async function deleteOwnAccount(user: CurrentUser, raw: unknown, headers?: Headers) {
  const input = deleteAccountSchema.parse(raw);
  const account = await prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
  if (!account?.password || !(await verifyPassword({ hash: account.password, password: input.password }))) {
    throw badRequest("Passwort ist nicht korrekt.", { password: "Passwort ist nicht korrekt." });
  }
  await prisma.$transaction(
    async (tx) => {
      if (user.role === "ADMIN") {
        const admins = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
        const others = await tx.user.count({ where: { id: { not: user.id } } });
        if (admins <= 1 && others > 0) {
          throw conflict("Du bist der letzte Administrator. Ernenne zuerst eine weitere Person zum Administrator.");
        }
      }
      await audit({ action: "account.deleted", severity: "SECURITY", actorId: user.id, targetUserId: user.id, headers, metadata: { deletedUserId: user.id } }, tx);
      await tx.user.delete({ where: { id: user.id } });
    },
    { isolationLevel: "Serializable" },
  );
}

export async function listOwnSessions(user: CurrentUser, currentSessionId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, createdAt: true, updatedAt: true, expiresAt: true, userAgent: true, ipAddress: true },
  });
  return sessions.map((s) => ({
    ...s,
    ipAddress: s.ipAddress ? s.ipAddress.replace(/\.\d+$/, ".x") : null,
    current: s.id === currentSessionId,
  }));
}

export async function revokeOwnSessions(user: CurrentUser, currentSessionId: string, which: "others" | string, headers?: Headers) {
  const where =
    which === "others"
      ? { userId: user.id, id: { not: currentSessionId } }
      : { userId: user.id, id: which };
  const { count } = await prisma.session.deleteMany({ where });
  await audit({ action: "auth.sessions_revoked", severity: "SECURITY", actorId: user.id, targetUserId: user.id, headers, metadata: { count, scope: which === "others" ? "others" : "single" } });
  return { count };
}
