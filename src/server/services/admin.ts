import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../db";
import { audit } from "../audit";
import { auth } from "../auth";
import { env } from "../env";
import { badRequest, conflict, notFound } from "../errors";
import type { CurrentUser } from "../current-user";
import { checkAdminChange, checkAdminDelete } from "@/lib/permissions";
import { adminUserCreateSchema, adminUserQuerySchema, adminUserUpdateSchema, auditQuerySchema } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

export async function listUsers(raw: unknown) {
  const q = adminUserQuerySchema.parse(raw);
  const where: Prisma.UserWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.role ? { role: q.role } : {}),
    ...(q.q
      ? { OR: [{ email: { contains: q.q, mode: "insensitive" } }, { name: { contains: q.q, mode: "insensitive" } }] }
      : {}),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
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
        _count: { select: { entries: true, sessions: true } },
      },
    }),
  ]);
  return { users, total, page: q.page, pageSize: q.pageSize, pages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

/**
 * Detailansicht für Administratoren. Aus Gründen der Datenminimierung werden nur
 * aggregierte Kennzahlen gezeigt – keine einzelnen Konsumeinträge.
 */
export async function userDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      status: true,
      timezone: true,
      createdAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      lastLogoutAt: true,
      profileUpdatedAt: true,
      onboardingCompleted: true,
      communityOptIn: true,
      notificationsEnabled: true,
      sessions: { select: { id: true, createdAt: true, updatedAt: true, expiresAt: true, userAgent: true }, orderBy: { updatedAt: "desc" } },
      _count: { select: { entries: true, beverages: true, pushSubscriptions: true } },
    },
  });
  if (!user) throw notFound("Benutzer nicht gefunden.");
  const agg = await prisma.consumptionEntry.aggregate({
    where: { userId: id },
    _min: { consumedAt: true },
    _max: { consumedAt: true },
  });
  return { ...user, firstEntryAt: agg._min.consumedAt, lastEntryAt: agg._max.consumedAt };
}

async function activeAdminCount(tx: Prisma.TransactionClient) {
  return tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
}

export async function updateUser(actor: CurrentUser, id: string, raw: unknown, headers?: Headers) {
  const change = adminUserUpdateSchema.parse(raw);
  if (!change.role && !change.status) throw badRequest("Keine Änderung angegeben.");
  return prisma.$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
      if (!target) throw notFound("Benutzer nicht gefunden.");
      const check = checkAdminChange(actor, target, change, await activeAdminCount(tx));
      if (!check.ok) throw badRequest(check.reason);
      const updated = await tx.user.update({ where: { id }, data: change, select: { id: true, role: true, status: true } });
      if (change.status && change.status !== target.status) {
        if (change.status === "DEACTIVATED") await tx.session.deleteMany({ where: { userId: id } });
        await audit({ action: "admin.user_status_changed", severity: "SECURITY", actorId: actor.id, targetUserId: id, headers, metadata: { from: target.status, to: change.status } }, tx);
      }
      if (change.role && change.role !== target.role) {
        // Rollenänderung: bestehende Sitzungen beenden, damit neue Rechte sauber greifen
        if (id !== actor.id) await tx.session.deleteMany({ where: { userId: id } });
        await audit({ action: "admin.user_role_changed", severity: "SECURITY", actorId: actor.id, targetUserId: id, headers, metadata: { from: target.role, to: change.role } }, tx);
      }
      return updated;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function revokeUserSessions(actor: CurrentUser, id: string, headers?: Headers) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw notFound("Benutzer nicht gefunden.");
  const { count } = await prisma.session.deleteMany({ where: { userId: id } });
  await audit({ action: "admin.sessions_revoked", severity: "SECURITY", actorId: actor.id, targetUserId: id, headers, metadata: { count } });
  return { count };
}

export async function deleteUser(actor: CurrentUser, id: string, headers?: Headers) {
  await prisma.$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
      if (!target) throw notFound("Benutzer nicht gefunden.");
      if (target.id === actor.id) throw badRequest("Das eigene Konto bitte über die Einstellungen löschen.");
      const check = checkAdminDelete(actor, target, await activeAdminCount(tx));
      if (!check.ok) throw badRequest(check.reason);
      // Protokolleintrag vor dem Löschen (targetUserId wird durch ON DELETE SET NULL pseudonymisiert)
      await audit({ action: "admin.user_deleted", severity: "SECURITY", actorId: actor.id, targetUserId: id, headers, metadata: { deletedUserId: id } }, tx);
      await tx.user.delete({ where: { id } });
    },
    { isolationLevel: "Serializable" },
  );
}

/**
 * Einmal-Link zum Zurücksetzen des Passworts (für Installationen ohne SMTP).
 * Der Link wird nur dem Administrator einmalig angezeigt und nicht protokolliert.
 */
/** Einmal-Token im Format von Better Auth ("reset-password:<token>") anlegen. */
async function issuePasswordToken(userId: string, minutes: number) {
  const ctx = await auth.$context;
  const token = randomBytes(24).toString("base64url");
  await ctx.internalAdapter.createVerificationValue({
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + minutes * 60_000),
  });
  return `${env.appUrl}/passwort-zuruecksetzen?token=${token}`;
}

export async function createResetLink(actor: CurrentUser, id: string, headers?: Headers) {
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!target) throw notFound("Benutzer nicht gefunden.");
  if (target.status !== "ACTIVE") throw badRequest("Das Konto ist deaktiviert.");
  const url = await issuePasswordToken(id, 60);
  await audit({ action: "admin.reset_link_created", severity: "SECURITY", actorId: actor.id, targetUserId: id, headers });
  return { url, expiresInMinutes: 60 };
}

const INVITE_VALID_MINUTES = 7 * 24 * 60;

/**
 * Benutzer durch die Administration anlegen – funktioniert auch bei geschlossener Registrierung.
 *  - mode "link":     zufälliges, unbekanntes Passwort + Einladungslink (7 Tage), mit dem die Person
 *                     ihr eigenes Passwort festlegt. Die Administration kennt das Passwort nie.
 *  - mode "password": Startpasswort wird von der Administration vergeben.
 * Die E-Mail-Adresse gilt als bestätigt. Beim ersten Login folgt das normale Onboarding.
 */
export async function createUser(actor: CurrentUser, raw: unknown, headers?: Headers) {
  const input = adminUserCreateSchema.parse(raw);
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw conflict("Mit dieser E-Mail-Adresse besteht bereits ein Konto.");
  }
  const password = input.mode === "password" ? input.password! : randomBytes(32).toString("base64url");
  const hash = await hashPassword(password);
  const id = randomUUID().replace(/-/g, "");
  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id,
          name: input.name,
          email: input.email,
          emailVerified: true,
          role: input.role,
          timezone: env.defaultTimezone,
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.account.create({
        data: { id: randomUUID().replace(/-/g, ""), accountId: id, providerId: "credential", userId: id, password: hash, createdAt: now, updatedAt: now },
      });
      await audit(
        { action: "admin.user_created", severity: "SECURITY", actorId: actor.id, targetUserId: id, headers, metadata: { role: input.role, mode: input.mode } },
        tx,
      );
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") throw conflict("Mit dieser E-Mail-Adresse besteht bereits ein Konto.");
    throw e;
  }
  const setupUrl = input.mode === "link" ? await issuePasswordToken(id, INVITE_VALID_MINUTES) : null;
  return { user: { id, name: input.name, email: input.email, role: input.role }, setupUrl, setupValidDays: setupUrl ? 7 : null };
}

export async function auditLogPage(raw: unknown) {
  const q = auditQuerySchema.parse(raw);
  const where: Prisma.AuditLogWhereInput = {
    ...(q.severity ? { severity: q.severity } : {}),
    ...(q.userId ? { OR: [{ actorId: q.userId }, { targetUserId: q.userId }] } : {}),
    ...(q.q ? { action: { contains: q.q, mode: "insensitive" } } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize, pages: Math.max(1, Math.ceil(total / q.pageSize)) };
}

export async function systemOverview() {
  const since = new Date(Date.now() - 24 * 3_600_000);
  const [users, active, admins, entries, errors24h, security24h] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } }),
    prisma.consumptionEntry.count(),
    prisma.auditLog.count({ where: { severity: "ERROR", createdAt: { gte: since } } }),
    prisma.auditLog.count({ where: { severity: "SECURITY", createdAt: { gte: since } } }),
  ]);
  return { users, active, admins, entries, errors24h, security24h, mailEnabled: env.mailEnabled, pushEnabled: env.pushEnabled };
}
