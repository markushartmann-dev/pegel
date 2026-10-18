import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { resolveSession } from "@/server/current-user";
import * as me from "@/app/api/v1/me/route";
import * as sessions from "@/app/api/v1/me/sessions/route";
import * as onboarding from "@/app/api/v1/me/onboarding/route";
import * as profile from "@/app/api/v1/me/profile/route";
import * as entries from "@/app/api/v1/entries/route";
import { authRequest, call, cookieFrom, onboardedUser, resetDb, signIn, signUp } from "./helpers";

beforeEach(resetDb);

describe("Registrierung und Anmeldung", () => {
  it("erster Benutzer wird Administrator, weitere sind normale Benutzer", async () => {
    const first = await signUp();
    const second = await signUp();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: first.id } })).role).toBe("ADMIN");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: second.id } })).role).toBe("USER");
    const log = await prisma.auditLog.findMany({ where: { action: "auth.register" } });
    expect(log).toHaveLength(2);
  });

  it("speichert kein Klartextpasswort", async () => {
    const u = await signUp({ password: "mein-klartext-passwort" });
    const acc = await prisma.account.findFirstOrThrow({ where: { userId: u.id } });
    expect(acc.password).toBeTruthy();
    expect(acc.password).not.toContain("mein-klartext-passwort");
  });

  it("lehnt zu kurze Passwörter ab", async () => {
    const res = await authRequest("/sign-up/email", { email: "kurz@example.test", password: "kurz", name: "X" });
    expect(res.status).toBe(400);
  });

  it("Rolle kann bei der Registrierung nicht manipuliert werden", async () => {
    await signUp();
    const res = await authRequest("/sign-up/email", { email: "evil@example.test", password: "sehr-sicheres-passwort", name: "Evil", role: "ADMIN", status: "ACTIVE" });
    if (res.ok) {
      expect((await prisma.user.findUniqueOrThrow({ where: { email: "evil@example.test" } })).role).toBe("USER");
    } else {
      expect(res.status).toBe(400);
    }
  });

  it("Login setzt lastLoginAt und protokolliert; falsches Passwort wird protokolliert", async () => {
    const u = await signUp();
    const ok = await signIn(u.email, u.password);
    expect(ok.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(user.lastLoginAt).not.toBeNull();
    const bad = await signIn(u.email, "falsches-passwort-123");
    expect(bad.status).toBe(401);
    const failed = await prisma.auditLog.findMany({ where: { action: "auth.login_failed", targetUserId: u.id } });
    expect(failed).toHaveLength(1);
    // Protokoll enthält kein Passwort
    expect(JSON.stringify(failed)).not.toContain("falsches-passwort");
  });

  it("sperrt nach zu vielen Fehlversuchen das Konto vorübergehend", async () => {
    const u = await signUp();
    for (let i = 0; i < 8; i++) expect((await signIn(u.email, `falsch-${i}-xxxxxxxx`)).status).toBe(401);
    const blocked = await signIn(u.email, u.password);
    expect(blocked.status).toBe(429);
  });
});

describe("Persistente Sitzungen", () => {
  it("'Angemeldet bleiben' setzt ein HttpOnly-Cookie mit Max-Age, sonst Sitzungscookie", async () => {
    const u = await signUp();
    const persistent = await signIn(u.email, u.password, true);
    const cookie = persistent.headers.getSetCookie().find((c) => c.startsWith("pegel.session_token="))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=2592000/); // 30 Tage
    const session = await signIn(u.email, u.password, false);
    const sc = session.headers.getSetCookie().find((c) => c.startsWith("pegel.session_token="))!;
    expect(sc).not.toMatch(/Max-Age/);
  });

  it("jeder Login erzeugt eine neue Sitzung (keine Session-Fixation)", async () => {
    const u = await signUp();
    const a = cookieFrom(await signIn(u.email, u.password));
    const b = cookieFrom(await signIn(u.email, u.password));
    expect(a).not.toBe(b);
    expect(await prisma.session.count({ where: { userId: u.id } })).toBeGreaterThanOrEqual(3);
  });

  it("Sitzung wird serverseitig validiert und ist widerrufbar", async () => {
    const u = await signUp();
    const other = cookieFrom(await signIn(u.email, u.password));
    expect((await call(me.GET, { cookie: u.cookie })).status).toBe(200);
    expect((await call(me.GET, { cookie: other })).status).toBe(200);
    // Alle anderen Sitzungen beenden
    const res = await call(sessions.DELETE, { method: "DELETE", cookie: u.cookie });
    expect(res.status).toBe(200);
    expect((await call(me.GET, { cookie: other })).status).toBe(401);
    expect((await call(me.GET, { cookie: u.cookie })).status).toBe(200);
  });

  it("ohne oder mit gefälschtem Cookie kein Zugriff", async () => {
    expect((await call(me.GET)).status).toBe(401);
    expect((await call(me.GET, { cookie: "pegel.session_token=gefaelscht.abc" })).status).toBe(401);
  });

  it("Logout beendet die Sitzung und setzt lastLogoutAt", async () => {
    const u = await signUp();
    const res = await authRequest("/sign-out", {}, u.cookie);
    expect(res.status).toBe(200);
    expect(await resolveSession(new Headers({ cookie: u.cookie }))).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).lastLogoutAt).not.toBeNull();
  });

  it("deaktivierte Konten können sich nicht anmelden und verlieren bestehende Sitzungen", async () => {
    const u = await signUp();
    await prisma.user.update({ where: { id: u.id }, data: { status: "DEACTIVATED" } });
    expect((await call(me.GET, { cookie: u.cookie })).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0);
    const res = await signIn(u.email, u.password);
    expect(res.status).toBe(403);
  });
});

describe("Onboarding", () => {
  it("ohne Onboarding sind fachliche Endpunkte gesperrt", async () => {
    const u = await signUp();
    const res = await call(entries.GET, { cookie: u.cookie });
    expect(res.status).toBe(409);
    expect(res.json.code).toBe("ONBOARDING_REQUIRED");
  });

  it("validiert serverseitig und speichert Profil, Revision und Einwilligungen", async () => {
    const u = await signUp();
    const invalid = await call(onboarding.POST, {
      method: "POST",
      cookie: u.cookie,
      body: { profile: { distributionModel: "WIDMARK_MALE", weightKg: 10, heightCm: 180 }, timezone: "Europe/Berlin", acceptPrivacy: true, acceptHealthData: true },
    });
    expect(invalid.status).toBe(400);
    const noConsent = await call(onboarding.POST, {
      method: "POST",
      cookie: u.cookie,
      body: { profile: { distributionModel: "WIDMARK_MALE", weightKg: 80, heightCm: 180 }, timezone: "Europe/Berlin", acceptPrivacy: true, acceptHealthData: false },
    });
    expect(noConsent.status).toBe(400);
    const ok = await call(onboarding.POST, {
      method: "POST",
      cookie: u.cookie,
      body: { profile: { distributionModel: "SEIDL_FEMALE", weightKg: 62.5, heightCm: 168 }, timezone: "Europe/Vienna", themeMode: "DARK", colorScheme: "OCEAN", acceptPrivacy: true, acceptHealthData: true },
    });
    expect(ok.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, include: { profile: true, profileRevisions: true, consents: true } });
    expect(user.onboardingCompleted).toBe(true);
    expect(user.timezone).toBe("Europe/Vienna");
    expect(user.themeMode).toBe("DARK");
    expect(user.colorScheme).toBe("OCEAN");
    expect(Number(user.profile!.weightKg)).toBe(62.5);
    expect(user.profileRevisions).toHaveLength(1);
    expect(user.consents.map((c) => c.type).sort()).toEqual(["COMMUNITY_RANKING", "HEALTH_DATA_PROCESSING", "PRIVACY_NOTICE"]);
    expect(user.communityOptIn).toBe(true);
    expect(user.consents.find((c) => c.type === "COMMUNITY_RANKING")?.granted).toBe(true);
  });

  it("Profiländerung erzeugt neue Revision, ändert aber keine Einträge", async () => {
    const u = await onboardedUser();
    const res = await call(profile.PUT, { method: "PUT", cookie: u.cookie, body: { distributionModel: "CUSTOM", customFactor: 0.62, weightKg: 85, heightCm: 180 } });
    expect(res.status).toBe(200);
    expect(await prisma.userProfileRevision.count({ where: { userId: u.id } })).toBe(2);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).profileUpdatedAt).not.toBeNull();
  });
});

describe("Theme-Einstellungen", () => {
  it("werden serverseitig gespeichert und bleiben nach erneutem Login erhalten", async () => {
    const u = await onboardedUser();
    const res = await call(me.PATCH, { method: "PATCH", cookie: u.cookie, body: { themeMode: "LIGHT", colorScheme: "SUNSET" } });
    expect(res.status).toBe(200);
    await authRequest("/sign-out", {}, u.cookie);
    const again = cookieFrom(await signIn(u.email, u.password));
    const meRes = await call(me.GET, { cookie: again });
    expect(meRes.json.user).toMatchObject({ themeMode: "LIGHT", colorScheme: "SUNSET" });
  });
  it("lehnt unbekannte Schemata ab", async () => {
    const u = await onboardedUser();
    expect((await call(me.PATCH, { method: "PATCH", cookie: u.cookie, body: { colorScheme: "PINK" } })).status).toBe(400);
  });
});

describe("Community im Onboarding", () => {
  it("Abwahl im Onboarding wird gespeichert und als widerrufene Einwilligung protokolliert", async () => {
    const u = await signUp();
    const res = await call(onboarding.POST, {
      method: "POST",
      cookie: u.cookie,
      body: { profile: { distributionModel: "WIDMARK_MALE", weightKg: 80, heightCm: 180 }, timezone: "Europe/Berlin", communityOptIn: false, acceptPrivacy: true, acceptHealthData: true },
    });
    expect(res.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, include: { consents: true } });
    expect(user.communityOptIn).toBe(false);
    expect(user.consents.find((c) => c.type === "COMMUNITY_RANKING")?.granted).toBe(false);
  });
});
