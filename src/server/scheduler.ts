import "server-only";
import { prisma } from "./db";
import { env } from "./env";
import { dayKey, isoWeekKey, zonedParts } from "@/lib/dates";
import { notifyOnce } from "./services/notifications";

/**
 * Einfacher Hintergrundjob im App-Prozess (kein zusätzlicher Container nötig).
 * Läuft jede Minute und versendet fällige, vom Benutzer aktivierte Erinnerungen.
 * Doppelversand wird über UserNotification(userId, dedupeKey) verhindert –
 * auch nach einem Neustart.
 */
const g = globalThis as unknown as { __pegelScheduler?: NodeJS.Timeout };

export async function runDueNotifications(now = new Date()) {
  if (!env.pushEnabled) return { checked: 0, sent: 0 };
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      notificationsEnabled: true,
      OR: [{ reminderEnabled: true }, { weeklySummaryEnabled: true }],
      pushSubscriptions: { some: {} },
    },
    select: { id: true, timezone: true, reminderEnabled: true, reminderTime: true, weeklySummaryEnabled: true },
  });
  let sent = 0;
  for (const u of users) {
    const p = zonedParts(now, u.timezone);
    const clock = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
    const today = dayKey(now, u.timezone);
    // Erinnerung: im Zeitfenster [reminderTime, reminderTime + 30 min), einmal pro Tag
    if (u.reminderEnabled && clock >= u.reminderTime && minutesBetween(u.reminderTime, clock) < 30) {
      const r = await notifyOnce(u.id, "reminder", `reminder:${today}`, {
        title: "Pegel",
        body: "Erinnerung: Möchtest du deine Einträge für heute ergänzen?",
        url: "/erfassen",
        tag: "pegel-reminder",
      });
      if (r) sent++;
    }
    // Wochenzusammenfassung: Montag ab 10:00, einmal pro Woche – ohne Zahlen auf dem Sperrbildschirm
    if (u.weeklySummaryEnabled && p.isoWeekday === 1 && p.hour >= 10 && p.hour < 12) {
      const r = await notifyOnce(u.id, "weekly", `weekly:${isoWeekKey(today)}`, {
        title: "Pegel",
        body: "Deine Wochenübersicht ist bereit.",
        url: "/statistik?zeitraum=7d",
        tag: "pegel-weekly",
      });
      if (r) sent++;
    }
  }
  return { checked: users.length, sent };
}

function minutesBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

export function startScheduler() {
  if (!env.schedulerEnabled || g.__pegelScheduler) return;
  g.__pegelScheduler = setInterval(() => {
    runDueNotifications().catch((err) => console.error("[scheduler] Fehler:", (err as Error).message));
  }, 60_000);
  g.__pegelScheduler.unref?.();
  console.log("[scheduler] Hintergrundjob für Erinnerungen gestartet.");
}
