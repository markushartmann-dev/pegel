import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as adminUsers from "@/app/api/v1/admin/users/route";
import * as me from "@/app/api/v1/me/route";
import { authRequest, call, cookieFrom, onboardedUser, resetDb, signIn } from "./helpers";

beforeEach(resetDb);

describe("Administration legt Benutzer an", () => {
  it("mit Startpasswort: Anmeldung möglich, Onboarding offen, protokolliert", async () => {
    const admin = await onboardedUser();
    const res = await call(adminUsers.POST, {
      method: "POST",
      cookie: admin.cookie,
      body: { name: "Paula", email: "Paula@Example.TEST", role: "USER", mode: "password", password: "start-passwort-123" },
    });
    expect(res.status).toBe(201);
    expect(res.json.setupUrl).toBeNull();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "paula@example.test" } });
    expect(user).toMatchObject({ role: "USER", status: "ACTIVE", emailVerified: true, onboardingCompleted: false });

    const login = await signIn("paula@example.test", "start-passwort-123");
    expect(login.status).toBe(200);
    const meRes = await call(me.GET, { cookie: cookieFrom(login) });
    expect(meRes.json.user).toMatchObject({ onboardingCompleted: false });

    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "admin.user_created" } });
    expect(log).toMatchObject({ actorId: admin.id, targetUserId: user.id });
    expect(JSON.stringify(log)).not.toContain("start-passwort-123");
  });

  it("mit Einladungslink: Person setzt eigenes Passwort, unbekanntes Zufallspasswort funktioniert nicht", async () => {
    const admin = await onboardedUser();
    const res = await call(adminUsers.POST, {
      method: "POST",
      cookie: admin.cookie,
      body: { name: "Tom", email: "tom@example.test", role: "ADMIN" },
    });
    expect(res.status).toBe(201);
    const token = new URL(res.json.setupUrl as string).searchParams.get("token")!;
    expect(token).toBeTruthy();
    const verification = await prisma.verification.findFirstOrThrow({ where: { identifier: `reset-password:${token}` } });
    expect(verification.expiresAt.getTime() - Date.now()).toBeGreaterThan(6 * 86_400_000);

    expect((await authRequest("/reset-password", { token, newPassword: "eigenes-passwort-99" })).status).toBe(200);
    expect((await signIn("tom@example.test", "eigenes-passwort-99")).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: "tom@example.test" } })).role).toBe("ADMIN");
    // Link ist nur einmal verwendbar
    expect((await authRequest("/reset-password", { token, newPassword: "noch-ein-passwort-1" })).status).toBe(400);
  });

  it("Validierung, doppelte E-Mail und Berechtigung", async () => {
    const admin = await onboardedUser();
    const user = await onboardedUser();
    const bad = await call(adminUsers.POST, { method: "POST", cookie: admin.cookie, body: { name: "X", email: "kein-mail", mode: "password", password: "kurz" } });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.json.fields as object)).toEqual(expect.arrayContaining(["name", "email", "password"]));
    const dup = await call(adminUsers.POST, { method: "POST", cookie: admin.cookie, body: { name: "Doppelt", email: user.email } });
    expect(dup.status).toBe(409);
    const forbidden = await call(adminUsers.POST, { method: "POST", cookie: user.cookie, body: { name: "Hacker", email: "h@example.test" } });
    expect(forbidden.status).toBe(403);
    expect(await prisma.user.count({ where: { email: "h@example.test" } })).toBe(0);
  });
});
