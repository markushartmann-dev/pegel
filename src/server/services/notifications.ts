import "server-only";
import webpush from "web-push";
import { prisma } from "../db";
import { env } from "../env";
import { audit } from "../audit";
import { badRequest } from "../errors";
import type { CurrentUser } from "../current-user";
import { notificationSettingsSchema, pushSubscriptionSchema } from "@/lib/validation";
import { CONSENT_VERSION } from "./profile";

/**
 * Web Push mit VAPID (ohne externen Dienst außer dem Push-Service des Browsers).
 * Benachrichtigungen enthalten bewusst keine Mengen oder Promillewerte (Sperrbildschirm).
 */
let configured = false;
function ensureConfigured() {
  if (!env.pushEnabled) throw badRequest("Push-Benachrichtigungen sind auf diesem Server nicht eingerichtet (VAPID-Schlüssel fehlen).");
  if (!configured) {
    webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
    configured = true;
  }
}

export function pushConfig() {
  return { enabled: env.pushEnabled, publicKey: env.pushEnabled ? env.vapid.publicKey : null };
}

export async function getNotificationSettings(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { notificationsEnabled: true, reminderEnabled: true, reminderTime: true, weeklySummaryEnabled: true, _count: { select: { pushSubscriptions: true } } },
  });
  return {
    notificationsEnabled: u.notificationsEnabled,
    reminderEnabled: u.reminderEnabled,
    reminderTime: u.reminderTime,
    weeklySummaryEnabled: u.weeklySummaryEnabled,
    subscriptions: u._count.pushSubscriptions,
  };
}

export async function updateNotificationSettings(user: CurrentUser, raw: unknown, headers?: Headers) {
  const input = notificationSettingsSchema.parse(raw);
  await prisma.user.update({ where: { id: user.id }, data: input });
  await audit({ action: "settings.updated", actorId: user.id, targetUserId: user.id, headers, metadata: { notifications: input } });
  return getNotificationSettings(user.id);
}

export async function subscribe(user: CurrentUser, raw: unknown, headers?: Headers) {
  ensureConfigured();
  const sub = pushSubscriptionSchema.parse(raw);
  await prisma.$transaction(async (tx) => {
    // Ein Endpoint gehört immer genau einem Benutzer (Gerätewechsel zwischen Konten)
    await tx.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: headers?.get("user-agent")?.slice(0, 200) ?? null,
      },
      update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, failureCount: 0 },
    });
    await tx.user.update({ where: { id: user.id }, data: { notificationsEnabled: true } });
    await tx.userConsent.create({ data: { userId: user.id, type: "PUSH_NOTIFICATIONS", granted: true, version: CONSENT_VERSION } });
  });
  await audit({ action: "push.subscribed", actorId: user.id, targetUserId: user.id, headers });
}

export async function unsubscribe(user: CurrentUser, endpoint: string | null, headers?: Headers) {
  await prisma.$transaction(async (tx) => {
    if (endpoint) await tx.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
    else await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
    const remaining = await tx.pushSubscription.count({ where: { userId: user.id } });
    if (remaining === 0) {
      await tx.user.update({ where: { id: user.id }, data: { notificationsEnabled: false } });
      await tx.userConsent.create({ data: { userId: user.id, type: "PUSH_NOTIFICATIONS", granted: false, version: CONSENT_VERSION } });
    }
  });
  await audit({ action: "push.unsubscribed", actorId: user.id, targetUserId: user.id, headers });
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Sendet an alle Geräte eines Benutzers. Abgelaufene Abonnements (404/410) werden entfernt,
 * wiederholt fehlschlagende nach 5 Fehlversuchen ebenfalls.
 */
export async function sendToUser(userId: string, payload: PushPayload) {
  ensureConfigured();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let delivered = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12, urgency: "normal" },
      );
      delivered++;
      await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date(), failureCount: 0 } });
    } catch (err) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410 || s.failureCount + 1 >= 5) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        await audit({ action: "push.subscription_removed", actorId: null, targetUserId: userId, metadata: { status: status ?? null } });
      } else {
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { failureCount: { increment: 1 } } });
      }
    }
  }
  return { delivered, failed, devices: subs.length };
}

/** Versand mit Duplikatschutz über (userId, dedupeKey). */
export async function notifyOnce(userId: string, type: string, dedupeKey: string, payload: PushPayload) {
  try {
    await prisma.userNotification.create({ data: { userId, type, dedupeKey, title: payload.title, body: payload.body } });
  } catch {
    return null; // bereits versendet
  }
  const result = await sendToUser(userId, payload);
  await prisma.userNotification.update({
    where: { userId_dedupeKey: { userId, dedupeKey } },
    data: { delivered: result.delivered, failed: result.failed },
  });
  return result;
}

export async function sendTest(user: CurrentUser) {
  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  if (count === 0) throw badRequest("Auf diesem Konto ist noch kein Gerät für Push-Benachrichtigungen registriert.");
  return notifyOnce(user.id, "test", `test:${Date.now()}`, {
    title: "Pegel",
    body: "Testbenachrichtigung: Push funktioniert.",
    url: "/einstellungen/benachrichtigungen",
    tag: "pegel-test",
  });
}
