import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as beverages from "@/app/api/v1/beverages/route";
import * as suggestion from "@/app/api/v1/beverages/[id]/suggestion/route";
import * as adminSuggestions from "@/app/api/v1/admin/suggestions/route";
import * as adminReview from "@/app/api/v1/admin/suggestions/[id]/route";
import * as community from "@/app/api/v1/community/route";
import * as entries from "@/app/api/v1/entries/route";
import { toLocalDateTimeInput } from "@/lib/dates";
import { beverageId, call, makeAdmin, onboardedUser, resetDb } from "./helpers";

beforeEach(resetDb);

async function ownBeverage(cookie: string, name: string) {
  const res = await call(beverages.POST, { method: "POST", cookie, body: { name, volumeMl: 330, abv: 5.2, category: "BEER", isFavorite: true } });
  expect(res.status).toBe(200);
  return (res.json.beverage as { id: string }).id;
}

describe("Eigene Getränke für alle vorschlagen", () => {
  it("Vorschlag → Freigabe macht das Getränk global, Einträge bleiben erhalten", async () => {
    const admin = await onboardedUser();
    await makeAdmin(admin);
    const user = await onboardedUser();
    const other = await onboardedUser();
    const id = await ownBeverage(user.cookie, "Kellerbier Hausbrauerei");
    await call(entries.POST, {
      method: "POST",
      cookie: user.cookie,
      body: { beverageId: id, servings: 1, consumedAtLocal: toLocalDateTimeInput(Date.now() - 60_000, "Europe/Berlin"), timezone: "Europe/Berlin" },
    });

    // Fremde dürfen nicht vorschlagen, Nicht-Admins nichts freigeben
    expect((await call(suggestion.POST, { method: "POST", cookie: other.cookie, params: { id } })).status).toBe(404);
    expect((await call(suggestion.POST, { method: "POST", cookie: user.cookie, params: { id } })).status).toBe(200);
    expect((await call(adminSuggestions.GET, { cookie: user.cookie })).status).toBe(403);
    expect((await call(adminReview.POST, { method: "POST", cookie: user.cookie, params: { id }, body: { decision: "approve" } })).status).toBe(403);

    const list = await call(adminSuggestions.GET, { cookie: admin.cookie });
    expect((list.json.suggestions as { id: string }[]).map((s) => s.id)).toEqual([id]);

    const ok = await call(adminReview.POST, { method: "POST", cookie: admin.cookie, params: { id }, body: { decision: "approve" } });
    expect(ok.status).toBe(200);
    const b = await prisma.beverage.findUniqueOrThrow({ where: { id } });
    expect(b).toMatchObject({ ownerId: null, isDefault: true, suggestionStatus: "APPROVED", suggestedById: user.id });
    expect(await prisma.consumptionEntry.count({ where: { beverageId: id } })).toBe(1);

    // Jetzt für alle sichtbar, aber nicht mehr vom Vorschlagenden bearbeitbar
    const otherList = await call(beverages.GET, { cookie: other.cookie });
    expect((otherList.json.beverages as { id: string }[]).some((x) => x.id === id)).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: "admin.beverage_suggestion_approved", actorId: admin.id, targetUserId: user.id } })).toBe(1);
    // Doppelte Bearbeitung
    expect((await call(adminReview.POST, { method: "POST", cookie: admin.cookie, params: { id }, body: { decision: "approve" } })).status).toBe(404);
  });

  it("Ablehnung mit Begründung, erneuter Vorschlag, Zurückziehen und Namenskonflikt", async () => {
    const admin = await onboardedUser();
    await makeAdmin(admin);
    const user = await onboardedUser();
    const id = await ownBeverage(user.cookie, "Radler hausgemacht");
    await call(suggestion.POST, { method: "POST", cookie: user.cookie, params: { id } });

    const noNote = await call(adminReview.POST, { method: "POST", cookie: admin.cookie, params: { id }, body: { decision: "reject" } });
    expect(noNote.status).toBe(400);
    await call(adminReview.POST, { method: "POST", cookie: admin.cookie, params: { id }, body: { decision: "reject", note: "Bitte Alkoholgehalt prüfen" } });
    const mine = await call(beverages.GET, { cookie: user.cookie });
    const dto = (mine.json.beverages as { id: string; suggestionStatus: string; suggestionNote: string }[]).find((x) => x.id === id)!;
    expect(dto).toMatchObject({ suggestionStatus: "REJECTED", suggestionNote: "Bitte Alkoholgehalt prüfen" });

    expect((await call(suggestion.POST, { method: "POST", cookie: user.cookie, params: { id } })).status).toBe(200);
    expect((await call(suggestion.DELETE, { method: "DELETE", cookie: user.cookie, params: { id } })).status).toBe(200);
    expect((await prisma.beverage.findUniqueOrThrow({ where: { id } })).suggestionStatus).toBe("NONE");

    // Gleichnamiges Standardgetränk existiert schon
    const clashId = await ownBeverage(user.cookie, "Sekt");
    expect((await call(suggestion.POST, { method: "POST", cookie: user.cookie, params: { id: clashId } })).status).toBe(409);
    expect(await beverageId("Sekt")).not.toBe(clashId);
  });
});

describe("Community blendet Inaktive aus", () => {
  it("wer seit über 10 Tagen nicht aktiv war, fehlt im Ranking und kommt mit Aktivität zurück", async () => {
    const viewer = await onboardedUser();
    const active = await onboardedUser();
    const idle = await onboardedUser();
    const sekt = await beverageId("Sekt");
    for (const u of [active, idle]) {
      await call(entries.POST, {
        method: "POST",
        cookie: u.cookie,
        body: { beverageId: sekt, servings: 1, consumedAtLocal: toLocalDateTimeInput(Date.now() - 3 * 86_400_000, "Europe/Berlin"), timezone: "Europe/Berlin" },
      });
    }
    await prisma.user.updateMany({ where: { id: { in: [viewer.id, active.id, idle.id] } }, data: { communityOptIn: true } });
    const old = new Date(Date.now() - 11 * 86_400_000);
    await prisma.user.update({ where: { id: idle.id }, data: { lastActiveAt: old, lastLoginAt: old } });

    let r = await call(community.GET, { cookie: viewer.cookie, query: { period: "week" } });
    expect((r.json.top as unknown[]).length).toBe(1);
    expect(r.json.participantsTotal).toBe(2);
    const savings = r.json.savings as { participants: number };
    expect(savings.participants).toBe(2);

    await prisma.user.update({ where: { id: idle.id }, data: { lastActiveAt: new Date() } });
    r = await call(community.GET, { cookie: viewer.cookie, query: { period: "week" } });
    expect((r.json.top as unknown[]).length).toBe(2);
    expect(r.json.participantsTotal).toBe(3);
  });
});
