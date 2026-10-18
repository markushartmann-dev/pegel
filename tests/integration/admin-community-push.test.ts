import { beforeEach, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import { prisma } from "@/server/db";
import * as adminUsers from "@/app/api/v1/admin/users/route";
import * as adminUser from "@/app/api/v1/admin/users/[id]/route";
import * as adminSessions from "@/app/api/v1/admin/users/[id]/sessions/route";
import * as adminReset from "@/app/api/v1/admin/users/[id]/reset-link/route";
import * as adminAudit from "@/app/api/v1/admin/audit/route";
import * as me from "@/app/api/v1/me/route";
import * as community from "@/app/api/v1/community/route";
import * as communitySettings from "@/app/api/v1/me/community/route";
import * as entries from "@/app/api/v1/entries/route";
import * as exportRoute from "@/app/api/v1/me/export/route";
import * as deleteRoute from "@/app/api/v1/me/delete/route";
import * as subscription from "@/app/api/v1/notifications/subscription/route";
import * as pushTest from "@/app/api/v1/notifications/test/route";
import { toLocalDateTimeInput } from "@/lib/dates";
import { authRequest, beverageId, call, makeAdmin, onboardedUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("Administration", () => {
  it("normale Benutzer erhalten 403 und der Versuch wird protokolliert", async () => {
    const admin = await onboardedUser();
    const user = await onboardedUser();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe("ADMIN");
    expect((await call(adminUsers.GET, { cookie: user.cookie })).status).toBe(403);
    expect((await call(adminUser.PATCH, { method: "PATCH", cookie: user.cookie, params: { id: user.id }, body: { role: "ADMIN" } })).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("USER");
    expect(await prisma.auditLog.count({ where: { action: "security.forbidden", actorId: user.id } })).toBe(2);
  });

  it("Benutzerübersicht mit Suche, Status, Einträgen und Aktivitätszeitpunkten", async () => {
    const admin = await onboardedUser({ email: "admin@example.test" });
    await onboardedUser({ email: "anna@example.test" });
    const all = await call(adminUsers.GET, { cookie: admin.cookie });
    expect(all.json.total).toBe(2);
    const found = await call(adminUsers.GET, { cookie: admin.cookie, query: { q: "anna" } });
    const users = found.json.users as { email: string; lastLoginAt: string | null; _count: { entries: number } }[];
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("anna@example.test");
    expect(users[0].lastLoginAt).not.toBeNull();
    expect(users[0]._count.entries).toBe(0);
  });

  it("deaktivieren beendet Sitzungen; letzter Admin ist geschützt; Rollen änderbar", async () => {
    const admin = await onboardedUser();
    const user = await onboardedUser();
    const deact = await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: user.id }, body: { status: "DEACTIVATED" } });
    expect(deact.status).toBe(200);
    expect((await call(me.GET, { cookie: user.cookie })).status).toBe(401);

    const demoteSelf = await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: admin.id }, body: { role: "USER" } });
    expect(demoteSelf.status).toBe(400);
    expect(demoteSelf.json.error).toMatch(/letzte/);

    await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: user.id }, body: { status: "ACTIVE", role: "ADMIN" } });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("ADMIN");
    const log = await call(adminAudit.GET, { cookie: admin.cookie, query: { severity: "SECURITY" } });
    const actions = (log.json.items as { action: string }[]).map((i) => i.action);
    expect(actions).toEqual(expect.arrayContaining(["admin.user_status_changed", "admin.user_role_changed"]));
  });

  it("Sitzungen widerrufen, Reset-Link erzeugen und Konto löschen", async () => {
    const admin = await onboardedUser();
    const user = await onboardedUser();
    expect((await call(adminSessions.DELETE, { method: "DELETE", cookie: admin.cookie, params: { id: user.id } })).status).toBe(200);
    expect((await call(me.GET, { cookie: user.cookie })).status).toBe(401);

    const link = await call(adminReset.POST, { method: "POST", cookie: admin.cookie, params: { id: user.id } });
    const url = new URL(link.json.url as string);
    const token = url.searchParams.get("token")!;
    const reset = await authRequest("/reset-password", { token, newPassword: "ganz-neues-passwort-42" });
    expect(reset.status).toBe(200);
    // Reset-Token ist nicht im Protokoll
    expect(JSON.stringify(await prisma.auditLog.findMany())).not.toContain(token);

    await call(entries.POST, {
      method: "POST",
      cookie: admin.cookie,
      body: { beverageId: await beverageId("Sekt"), servings: 1, consumedAtLocal: toLocalDateTimeInput(Date.now() - 60_000, "Europe/Berlin"), timezone: "Europe/Berlin" },
    });
    const del = await call(adminUser.DELETE, { method: "DELETE", cookie: admin.cookie, params: { id: user.id } });
    expect(del.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    // Protokoll bleibt pseudonymisiert erhalten
    const deletedLog = await prisma.auditLog.findFirstOrThrow({ where: { action: "admin.user_deleted" } });
    expect(deletedLog.targetUserId).toBeNull();
  });
});

describe("Community-Ranking", () => {
  it("neue Konten nehmen standardmäßig teil (Anzeigename)", async () => {
    const a = await onboardedUser();
    const u = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
    expect(u.communityOptIn).toBe(true);
    expect(u.communityDisplay).toBe("DISPLAY_NAME");
  });

  it("nur Teilnehmende erscheinen; Pseudonym statt Name; Widerruf wirkt sofort", async () => {
    const a = await onboardedUser();
    const b = await onboardedUser();
    const c = await onboardedUser();
    // Ausgangslage: alle drei haben die Teilnahme abgewählt
    await prisma.user.updateMany({ data: { communityOptIn: false } });
    const sekt = await beverageId("Bier 0,5 l");
    const t = toLocalDateTimeInput(Date.now() - 3_600_000, "Europe/Berlin");
    for (const u of [a, b, c]) {
      await call(entries.POST, { method: "POST", cookie: u.cookie, body: { beverageId: sekt, servings: u === a ? 3 : 1, consumedAtLocal: t, timezone: "Europe/Berlin" } });
    }
    let r = await call(community.GET, { cookie: c.cookie, query: { period: "week" } });
    expect(r.json.top).toEqual([]);

    expect((await call(communitySettings.PUT, { method: "PUT", cookie: a.cookie, body: { optIn: true, display: "PSEUDONYM", pseudonym: "Hopfenkönig" } })).status).toBe(200);
    expect((await call(communitySettings.PUT, { method: "PUT", cookie: b.cookie, body: { optIn: true, display: "DISPLAY_NAME" } })).status).toBe(200);
    r = await call(community.GET, { cookie: c.cookie, query: { period: "week" } });
    const top = r.json.top as { label: string; grams: number; share: number; isViewer: boolean }[];
    expect(top.map((x) => x.label)).toEqual(["Hopfenkönig", "Test"]);
    expect(top[0].share).toBeCloseTo(0.75, 3);
    expect(JSON.stringify(r.json)).not.toContain(a.id);
    expect(JSON.stringify(r.json)).not.toContain(a.email);

    await call(communitySettings.PUT, { method: "PUT", cookie: a.cookie, body: { optIn: false } });
    r = await call(community.GET, { cookie: c.cookie, query: { period: "all" } });
    expect((r.json.top as unknown[]).length).toBe(1);
    expect(await prisma.userConsent.count({ where: { userId: a.id, type: "COMMUNITY_RANKING" } })).toBe(2);
  });
});

describe("Datenschutz: Export und Kontolöschung", () => {
  it("Export enthält Daten, aber keine Hashes oder Tokens", async () => {
    const u = await onboardedUser();
    const res = await call(exportRoute.GET, { cookie: u.cookie });
    expect(res.status).toBe(200);
    expect(res.res.headers.get("content-disposition")).toMatch(/attachment/);
    const text = JSON.stringify(res.json);
    expect(text).toContain(u.email);
    expect(text).not.toMatch(/scrypt|"password"|"token"/);
  });

  it("Löschung erfordert Passwort und Bestätigung und entfernt alle Daten", async () => {
    await onboardedUser(); // Admin
    const u = await onboardedUser();
    expect((await call(deleteRoute.POST, { method: "POST", cookie: u.cookie, body: { password: "falsch", confirm: "LÖSCHEN" } })).status).toBe(400);
    expect((await call(deleteRoute.POST, { method: "POST", cookie: u.cookie, body: { password: u.password, confirm: "ja" } })).status).toBe(400);
    const ok = await call(deleteRoute.POST, { method: "POST", cookie: u.cookie, body: { password: u.password, confirm: "LÖSCHEN" } });
    expect(ok.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: u.id } })).toBeNull();
    expect(await prisma.consumptionEntry.count({ where: { userId: u.id } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0);
  });

  it("letzter Admin kann sich nicht selbst löschen, solange andere Benutzer existieren", async () => {
    const admin = await onboardedUser();
    await onboardedUser();
    const res = await call(deleteRoute.POST, { method: "POST", cookie: admin.cookie, body: { password: admin.password, confirm: "LÖSCHEN" } });
    expect(res.status).toBe(409);
  });
});

describe("Push-Benachrichtigungen", () => {
  it("ohne VAPID-Konfiguration verständlicher Fehler", async () => {
    const u = await onboardedUser();
    const res = await call(subscription.POST, { method: "POST", cookie: u.cookie, body: { endpoint: "https://push.example/abc", keys: { p256dh: "x".repeat(20), auth: "y".repeat(10) } } });
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/VAPID/);
  });

  it("Abo anlegen, Test senden, abgelaufene Abos (410) werden bereinigt", async () => {
    const keys = webpush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    vi.resetModules();
    const sub = await import("@/app/api/v1/notifications/subscription/route");
    const test = await import("@/app/api/v1/notifications/test/route");
    const wp = (await import("web-push")).default;
    const u = await onboardedUser();

    const invalid = await call(sub.POST, { method: "POST", cookie: u.cookie, body: { endpoint: "http://insecure.example/x", keys: { p256dh: "x".repeat(20), auth: "y".repeat(10) } } });
    expect(invalid.status).toBe(400);

    const body = { endpoint: "https://push.example/device-1", keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) } };
    expect((await call(sub.POST, { method: "POST", cookie: u.cookie, body })).status).toBe(200);
    expect(await prisma.pushSubscription.count({ where: { userId: u.id } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).notificationsEnabled).toBe(true);

    const spy = vi.spyOn(wp, "sendNotification").mockResolvedValueOnce({ statusCode: 201, body: "", headers: {} });
    const ok = await call(test.POST, { method: "POST", cookie: u.cookie });
    expect(ok.json.result).toMatchObject({ delivered: 1, failed: 0 });
    const payload = JSON.parse(spy.mock.calls[0][1] as string);
    expect(payload.body).not.toMatch(/‰|Promille|\d+ g/);

    spy.mockRejectedValueOnce(Object.assign(new Error("Gone"), { statusCode: 410 }));
    const gone = await call(test.POST, { method: "POST", cookie: u.cookie });
    expect(gone.json.result).toMatchObject({ delivered: 0, failed: 1 });
    expect(await prisma.pushSubscription.count({ where: { userId: u.id } })).toBe(0);

    expect((await call(pushTest.POST, { method: "POST", cookie: u.cookie })).status).toBe(400);
    spy.mockRestore();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  it("Abmelden entfernt das Abo und protokolliert die Einwilligung", async () => {
    const keys = webpush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    vi.resetModules();
    const sub = await import("@/app/api/v1/notifications/subscription/route");
    const u = await onboardedUser();
    await call(sub.POST, { method: "POST", cookie: u.cookie, body: { endpoint: "https://push.example/d2", keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) } } });
    const res = await call(sub.DELETE, { method: "DELETE", cookie: u.cookie, body: { endpoint: "https://push.example/d2" } });
    expect(res.status).toBe(200);
    expect(await prisma.pushSubscription.count()).toBe(0);
    const consents = await prisma.userConsent.findMany({ where: { userId: u.id, type: "PUSH_NOTIFICATIONS" }, orderBy: { createdAt: "asc" } });
    expect(consents.map((c) => c.granted)).toEqual([true, false]);
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });
});

describe("Hilfsfunktionen", () => {
  it("makeAdmin", async () => {
    await onboardedUser();
    const u = await onboardedUser();
    await makeAdmin(u);
    expect((await call(adminUsers.GET, { cookie: u.cookie })).status).toBe(200);
  });
});
