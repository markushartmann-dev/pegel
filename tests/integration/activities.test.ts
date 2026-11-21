import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as types from "@/app/api/v1/activity-types/route";
import * as typeById from "@/app/api/v1/activity-types/[id]/route";
import * as typeSuggestion from "@/app/api/v1/activity-types/[id]/suggestion/route";
import * as activities from "@/app/api/v1/activities/route";
import * as activityById from "@/app/api/v1/activities/[id]/route";
import * as week from "@/app/api/v1/activities/week/route";
import * as review from "@/app/api/v1/admin/activity-suggestions/[id]/route";
import * as adminSuggestions from "@/app/api/v1/admin/suggestions/route";
import * as community from "@/app/api/v1/community/route";
import * as communitySettings from "@/app/api/v1/me/community/route";
import * as notice from "@/app/api/v1/me/notices/sport/route";
import * as onboarding from "@/app/api/v1/me/onboarding/route";
import * as exportRoute from "@/app/api/v1/me/export/route";
import * as deleteRoute from "@/app/api/v1/me/delete/route";
import * as estimate from "@/app/api/v1/estimate/route";
import * as entries from "@/app/api/v1/entries/route";
import { toLocalDateTimeInput } from "@/lib/dates";
import { activityTypeId, beverageId, call, onboardedUser, resetDb, signUp } from "./helpers";

beforeEach(resetDb);

const TZ = "Europe/Berlin";
const hoursAgo = (h: number) => toLocalDateTimeInput(Date.now() - h * 3_600_000, TZ);
const log = (cookie: string, body: Record<string, unknown>) =>
  call(activities.POST, { method: "POST", cookie, body: { performedAtLocal: hoursAgo(2), timezone: TZ, ...body } });

describe("Sport: Einheiten", () => {
  it("erfassen übernimmt die Standard-Intensität, speichert einen Snapshot und ist idempotent", async () => {
    const u = await onboardedUser();
    const run = await activityTypeId("Laufen");
    const clientRequestId = crypto.randomUUID();
    const r = await log(u.cookie, { activityTypeId: run, durationMin: 45, clientRequestId });
    expect(r.status).toBe(201);
    const entry = r.json.entry as { id: string; activityName: string; intensity: string; durationMin: number; icon: string };
    expect(entry).toMatchObject({ activityName: "Laufen", intensity: "VIGOROUS", durationMin: 45, icon: "run" });
    const again = await log(u.cookie, { activityTypeId: run, durationMin: 45, clientRequestId });
    expect(again.status).toBe(200);
    expect(await prisma.activityEntry.count({ where: { userId: u.id } })).toBe(1);

    // Umbenennen der Sportart ändert die bestehende Einheit nicht (Snapshot)
    await prisma.activityType.update({ where: { id: run }, data: { name: "Joggen" } });
    const hist = await call(activities.GET, { cookie: u.cookie });
    expect((hist.json.items as { activityName: string }[])[0].activityName).toBe("Laufen");
    await prisma.activityType.update({ where: { id: run }, data: { name: "Laufen" } });
  });

  it("prüft Dauer, Zeitpunkt und Sportart", async () => {
    const u = await onboardedUser();
    const bike = await activityTypeId("Radfahren");
    expect((await log(u.cookie, { activityTypeId: bike, durationMin: 0 })).status).toBe(400);
    expect((await log(u.cookie, { activityTypeId: bike, durationMin: 601 })).status).toBe(400);
    const future = await log(u.cookie, { activityTypeId: bike, durationMin: 30, performedAtLocal: toLocalDateTimeInput(Date.now() + 3 * 3_600_000, TZ) });
    expect(future.status).toBe(400);
    expect(future.json.fields).toHaveProperty("performedAtLocal");
    expect((await log(u.cookie, { activityTypeId: "gibt-es-nicht", durationMin: 30 })).status).toBe(404);
  });

  it("fremde Einheiten und eigene Sportarten anderer sind nicht erreichbar", async () => {
    const a = await onboardedUser();
    const b = await onboardedUser();
    const own = await call(types.POST, { method: "POST", cookie: a.cookie, body: { name: "Klettern", icon: "other", defaultIntensity: "VIGOROUS" } });
    expect(own.status).toBe(200);
    const ownId = (own.json.activityType as { id: string }).id;
    expect((await log(b.cookie, { activityTypeId: ownId, durationMin: 30 })).status).toBe(404);
    expect((await call(typeById.PATCH, { method: "PATCH", cookie: b.cookie, params: { id: ownId }, body: { name: "Gekapert" } })).status).toBe(404);

    const created = await log(a.cookie, { activityTypeId: ownId, durationMin: 90 });
    const id = (created.json.entry as { id: string }).id;
    expect((await call(activityById.GET, { cookie: b.cookie, params: { id } })).status).toBe(404);
    expect((await call(activityById.PATCH, { method: "PATCH", cookie: b.cookie, params: { id }, body: { durationMin: 1 } })).status).toBe(404);
    expect((await call(activityById.DELETE, { method: "DELETE", cookie: b.cookie, params: { id } })).status).toBe(404);
    expect((await prisma.activityEntry.findUniqueOrThrow({ where: { id } })).durationMin).toBe(90);
  });

  it("bearbeiten, löschen und Verlauf mit Filter und Summe", async () => {
    const u = await onboardedUser();
    const swim = await activityTypeId("Schwimmen");
    const yoga = await activityTypeId("Yoga/Pilates");
    const e1 = await log(u.cookie, { activityTypeId: swim, durationMin: 60 });
    await log(u.cookie, { activityTypeId: yoga, durationMin: 30, performedAtLocal: hoursAgo(5) });
    const id = (e1.json.entry as { id: string }).id;
    const upd = await call(activityById.PATCH, { method: "PATCH", cookie: u.cookie, params: { id }, body: { durationMin: 75, intensity: "VIGOROUS", note: "Bahnen" } });
    expect(upd.status).toBe(200);
    expect(upd.json.entry).toMatchObject({ durationMin: 75, intensity: "VIGOROUS", note: "Bahnen" });

    const all = await call(activities.GET, { cookie: u.cookie });
    expect(all.json).toMatchObject({ total: 2, sumMinutes: 105 });
    const onlySwim = await call(activities.GET, { cookie: u.cookie, query: { activityTypeId: swim } });
    expect(onlySwim.json).toMatchObject({ total: 1, sumMinutes: 75 });

    expect((await call(activityById.DELETE, { method: "DELETE", cookie: u.cookie, params: { id } })).status).toBe(200);
    expect(await prisma.activityEntry.count({ where: { userId: u.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { actorId: u.id, action: { in: ["activity.created", "activity.updated", "activity.deleted"] } } })).toBe(4);
  });

  it("archivierte Sportarten lassen sich nicht mehr erfassen", async () => {
    const u = await onboardedUser();
    const own = await call(types.POST, { method: "POST", cookie: u.cookie, body: { name: "Rudern" } });
    const id = (own.json.activityType as { id: string }).id;
    expect((await call(typeById.DELETE, { method: "DELETE", cookie: u.cookie, params: { id } })).status).toBe(200);
    expect((await log(u.cookie, { activityTypeId: id, durationMin: 30 })).status).toBe(400);
    const listed = await call(types.GET, { cookie: u.cookie });
    expect((listed.json.activityTypes as { id: string }[]).some((t) => t.id === id)).toBe(false);
  });

  it("Standard-Sportarten ändert nur die Administration", async () => {
    const admin = await onboardedUser();
    const user = await onboardedUser();
    const bike = await activityTypeId("Radfahren");
    expect((await call(typeById.PATCH, { method: "PATCH", cookie: user.cookie, params: { id: bike }, body: { defaultIntensity: "VIGOROUS" } })).status).toBe(403);
    expect((await call(typeById.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: bike }, body: { defaultIntensity: "VIGOROUS" } })).status).toBe(200);
    expect(await prisma.auditLog.count({ where: { action: "admin.default_activity_type_changed", actorId: admin.id } })).toBe(1);
  });
});

describe("Sport: Woche, Schätzung und Community", () => {
  it("Wochenkachel rechnet nach WHO-Richtwert", async () => {
    const u = await onboardedUser();
    await log(u.cookie, { activityTypeId: await activityTypeId("Laufen"), durationMin: 30, performedAtLocal: hoursAgo(0.5) });
    await log(u.cookie, { activityTypeId: await activityTypeId("Yoga/Pilates"), durationMin: 40, performedAtLocal: hoursAgo(0.4) });
    const r = await call(week.GET, { cookie: u.cookie });
    expect(r.json).toMatchObject({ sessions: 2, minutes: 70, whoMinutes: 60, hasAny: true });
    expect((r.json.days as unknown[]).length).toBe(7);
  });

  it("Sport verändert die Promille-Schätzung nicht", async () => {
    const u = await onboardedUser();
    await call(entries.POST, { method: "POST", cookie: u.cookie, body: { beverageId: await beverageId("Bier 0,5 l"), servings: 2, consumedAtLocal: hoursAgo(1), timezone: TZ } });
    const before = await call(estimate.GET, { cookie: u.cookie });
    await log(u.cookie, { activityTypeId: await activityTypeId("Laufen"), durationMin: 120, performedAtLocal: hoursAgo(0.9) });
    const after = await call(estimate.GET, { cookie: u.cookie });
    // Zeitabhängige Felder (now, Kurve) unterscheiden sich um Millisekunden – verglichen werden die Modellgrößen
    const pick = (j: Record<string, unknown>) => {
      const e = j.estimate as { status: string; peak: number; peakAt: string; factor: number; drinksConsidered: number; params: unknown; flags: string[] };
      return { status: e.status, peak: e.peak, peakAt: e.peakAt, factor: e.factor, drinks: e.drinksConsidered, params: e.params, flags: e.flags };
    };
    expect(pick(before.json).status).toBe("ok");
    expect(pick(after.json)).toEqual(pick(before.json));
  });

  it("Bewegungs-Ranking: nur Teilnehmende, Pseudonym, keine IDs", async () => {
    const a = await onboardedUser();
    const b = await onboardedUser();
    const c = await onboardedUser();
    await call(communitySettings.PUT, { method: "PUT", cookie: a.cookie, body: { optIn: true, display: "PSEUDONYM", pseudonym: "Läuferin" } });
    await call(communitySettings.PUT, { method: "PUT", cookie: c.cookie, body: { optIn: false } });
    const run = await activityTypeId("Laufen");
    await log(a.cookie, { activityTypeId: run, durationMin: 90 });
    await log(a.cookie, { activityTypeId: run, durationMin: 30, performedAtLocal: hoursAgo(4) });
    await log(b.cookie, { activityTypeId: run, durationMin: 60 });
    await log(c.cookie, { activityTypeId: run, durationMin: 300 });

    const r = await call(community.GET, { cookie: b.cookie, query: { period: "week" } });
    const act = r.json.activity as { totalMinutes: number; top: { label: string; minutes: number; sessions: number; isViewer: boolean }[] };
    expect(act.top.map((x) => [x.label, x.minutes, x.sessions, x.isViewer])).toEqual([
      ["Läuferin", 120, 2, false],
      ["Test", 60, 1, true],
    ]);
    expect(act.totalMinutes).toBe(180);
    expect(JSON.stringify(r.json)).not.toContain(a.id);
  });
});

describe("Sport: Vorschläge", () => {
  it("eigene Sportart vorschlagen, freigeben → Standard-Sportart für alle", async () => {
    const admin = await onboardedUser();
    const u = await onboardedUser();
    const other = await onboardedUser();
    const own = await call(types.POST, { method: "POST", cookie: u.cookie, body: { name: "Tanzen", icon: "other", defaultIntensity: "MODERATE" } });
    const id = (own.json.activityType as { id: string }).id;
    expect((await call(typeSuggestion.POST, { method: "POST", cookie: u.cookie, params: { id } })).json).toMatchObject({ status: "PENDING" });
    const list = await call(adminSuggestions.GET, { cookie: admin.cookie });
    expect((list.json.activitySuggestions as { id: string }[]).map((s) => s.id)).toEqual([id]);
    expect((await call(review.POST, { method: "POST", cookie: u.cookie, params: { id }, body: { decision: "approve" } })).status).toBe(403);
    expect((await call(review.POST, { method: "POST", cookie: admin.cookie, params: { id }, body: { decision: "approve" } })).json).toMatchObject({ status: "APPROVED" });
    const seen = await call(types.GET, { cookie: other.cookie });
    expect((seen.json.activityTypes as { id: string; isDefault: boolean }[]).find((t) => t.id === id)).toMatchObject({ isDefault: true });
  });

  it("ablehnen verlangt eine Begründung, Namenskonflikt mit Standard wird abgewiesen", async () => {
    const admin = await onboardedUser();
    const u = await onboardedUser();
    const own = await call(types.POST, { method: "POST", cookie: u.cookie, body: { name: "Skaten" } });
    const id = (own.json.activityType as { id: string }).id;
    await call(typeSuggestion.POST, { method: "POST", cookie: u.cookie, params: { id } });
    expect((await call(review.POST, { method: "POST", cookie: admin.cookie, params: { id }, body: { decision: "reject" } })).status).toBe(400);
    expect((await call(review.POST, { method: "POST", cookie: admin.cookie, params: { id }, body: { decision: "reject", note: "Bitte genauer benennen" } })).json).toMatchObject({ status: "REJECTED" });

    const clash = await call(types.POST, { method: "POST", cookie: u.cookie, body: { name: "Laufen" } });
    const clashId = (clash.json.activityType as { id: string }).id;
    expect((await call(typeSuggestion.POST, { method: "POST", cookie: u.cookie, params: { id: clashId } })).status).toBe(409);
  });
});

describe("Sport: Datenschutz und Hinweis", () => {
  it("Export enthält Sportdaten, Kontolöschung entfernt sie", async () => {
    const u = await onboardedUser();
    await call(types.POST, { method: "POST", cookie: u.cookie, body: { name: "Bouldern" } });
    await log(u.cookie, { activityTypeId: await activityTypeId("Radfahren"), durationMin: 60, note: "zur Arbeit" });
    const ex = await call(exportRoute.GET, { cookie: u.cookie });
    const data = (ex.json as { data: { activityTypes: unknown[]; activityEntries: { note: string }[] } }).data;
    expect(data.activityTypes).toHaveLength(1);
    expect(data.activityEntries[0].note).toBe("zur Arbeit");

    expect((await call(deleteRoute.POST, { method: "POST", cookie: u.cookie, body: { password: u.password, confirm: "LÖSCHEN" } })).status).toBe(200);
    expect(await prisma.activityEntry.count({ where: { userId: u.id } })).toBe(0);
    expect(await prisma.activityType.count({ where: { ownerId: u.id } })).toBe(0);
  });

  it("neue Konten sehen den Hinweis nicht, bestehende können ihn ausblenden", async () => {
    const fresh = await signUp();
    const ok = await call(onboarding.POST, {
      method: "POST",
      cookie: fresh.cookie,
      body: { profile: { distributionModel: "WIDMARK_MALE", weightKg: 80, heightCm: 180 }, timezone: TZ, acceptPrivacy: true, acceptHealthData: true },
    });
    expect(ok.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: fresh.id } })).sportNoticeDismissedAt).not.toBeNull();

    const existing = await onboardedUser(); // wie ein Konto aus der Zeit vor 1.6
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existing.id } })).sportNoticeDismissedAt).toBeNull();
    expect((await call(notice.POST, { method: "POST", cookie: existing.cookie })).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: existing.id } })).sportNoticeDismissedAt).not.toBeNull();
  });
});
