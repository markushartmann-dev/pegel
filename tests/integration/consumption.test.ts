import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as beverages from "@/app/api/v1/beverages/route";
import * as beverage from "@/app/api/v1/beverages/[id]/route";
import * as entries from "@/app/api/v1/entries/route";
import * as entry from "@/app/api/v1/entries/[id]/route";
import * as calendar from "@/app/api/v1/calendar/route";
import * as calendarDay from "@/app/api/v1/calendar/day/route";
import * as statistics from "@/app/api/v1/statistics/route";
import * as estimate from "@/app/api/v1/estimate/route";
import { toLocalDateTimeInput } from "@/lib/dates";
import { beverageId, call, onboardedUser, resetDb } from "./helpers";

beforeEach(resetDb);

const nowLocal = (offsetMin = 0) => toLocalDateTimeInput(new Date(Date.now() + offsetMin * 60_000), "Europe/Berlin");

async function logEntry(cookie: string, body: Record<string, unknown>) {
  return call(entries.POST, { method: "POST", cookie, body: { servings: 1, consumedAtLocal: nowLocal(-5), timezone: "Europe/Berlin", ...body } });
}

describe("Getränkeverwaltung", () => {
  it("Standardgetränke sind vorhanden, eigene Getränke CRUD mit Grammberechnung", async () => {
    const u = await onboardedUser();
    const list = await call(beverages.GET, { cookie: u.cookie });
    const names = (list.json.beverages as { name: string }[]).map((b) => b.name);
    expect(names).toEqual(expect.arrayContaining(["Bier klein", "Bier 0,33 l", "Bier 0,5 l", "Sekt", "Radler 0,5 l"]));

    const created = await call(beverages.POST, { method: "POST", cookie: u.cookie, body: { name: "Helles", volumeMl: 500, abv: 4.8, category: "BEER" } });
    expect(created.status).toBe(200);
    const b = created.json.beverage as { id: string; alcoholGrams: number; own: boolean };
    expect(b.alcoholGrams).toBeCloseTo(18.94, 2);
    expect(b.own).toBe(true);

    const dup = await call(beverages.POST, { method: "POST", cookie: u.cookie, body: { name: "Helles", volumeMl: 330, abv: 5, category: "BEER" } });
    expect(dup.status).toBe(409);

    const upd = await call(beverage.PATCH, { method: "PATCH", cookie: u.cookie, params: { id: b.id }, body: { abv: 5.2 } });
    expect((upd.json.beverage as { alcoholGrams: number }).alcoholGrams).toBeCloseTo(20.51, 2);

    const arch = await call(beverage.DELETE, { method: "DELETE", cookie: u.cookie, params: { id: b.id } });
    expect((arch.json.beverage as { isActive: boolean }).isActive).toBe(false);
    const active = await call(beverages.GET, { cookie: u.cookie });
    expect((active.json.beverages as { id: string }[]).some((x) => x.id === b.id)).toBe(false);
  });

  it("validiert Eingaben serverseitig", async () => {
    const u = await onboardedUser();
    for (const body of [
      { name: "X", volumeMl: 500, abv: 5 },
      { name: "Bier", volumeMl: 0, abv: 5 },
      { name: "Bier", volumeMl: 500, abv: 120 },
      { name: "<script>", volumeMl: "abc", abv: 5 },
    ]) {
      expect((await call(beverages.POST, { method: "POST", cookie: u.cookie, body })).status).toBe(400);
    }
  });

  it("normale Benutzer können Standardgetränke nicht ändern; fremde Getränke sind unsichtbar", async () => {
    await onboardedUser(); // erster Benutzer = Administrator
    const a = await onboardedUser();
    const b = await onboardedUser();
    const def = await beverageId("Sekt");
    expect((await call(beverage.PATCH, { method: "PATCH", cookie: a.cookie, params: { id: def }, body: { abv: 50 } })).status).toBe(403);
    const own = await call(beverages.POST, { method: "POST", cookie: a.cookie, body: { name: "Privat", volumeMl: 100, abv: 10 } });
    const id = (own.json.beverage as { id: string }).id;
    expect((await call(beverage.PATCH, { method: "PATCH", cookie: b.cookie, params: { id }, body: { name: "Gekapert" } })).status).toBe(404);
    const listB = await call(beverages.GET, { cookie: b.cookie });
    expect((listB.json.beverages as { id: string }[]).some((x) => x.id === id)).toBe(false);
    expect((await logEntry(b.cookie, { beverageId: id })).status).toBe(404);
  });
});

describe("Konsumerfassung", () => {
  it("erfasst mit Snapshot, Idempotenz und Anpassung nur für diesen Eintrag", async () => {
    const u = await onboardedUser();
    const bier = await beverageId("Bier 0,5 l");
    const requestId = randomUUID();
    const first = await logEntry(u.cookie, { beverageId: bier, servings: 2, clientRequestId: requestId, note: "Feierabend" });
    expect(first.status).toBe(201);
    const e = first.json.entry as { id: string; alcoholGrams: number; beverageName: string };
    expect(e.alcoholGrams).toBeCloseTo(39.45, 2);
    // Doppelt abgeschickt → derselbe Eintrag
    const again = await logEntry(u.cookie, { beverageId: bier, servings: 2, clientRequestId: requestId });
    expect(again.status).toBe(200);
    expect((again.json.entry as { id: string }).id).toBe(e.id);
    expect(await prisma.consumptionEntry.count({ where: { userId: u.id } })).toBe(1);

    // Abweichender Alkoholgehalt nur für diesen Eintrag
    const custom = await logEntry(u.cookie, { beverageId: bier, abv: 7.5 });
    expect((custom.json.entry as { abv: number }).abv).toBe(7.5);
    expect(Number((await prisma.beverage.findUniqueOrThrow({ where: { id: bier } })).abv)).toBe(5);
  });

  it("spätere Getränkeänderungen verfälschen alte Einträge nicht", async () => {
    const u = await onboardedUser();
    const own = await call(beverages.POST, { method: "POST", cookie: u.cookie, body: { name: "Weißwein", volumeMl: 200, abv: 11 } });
    const id = (own.json.beverage as { id: string }).id;
    const logged = await logEntry(u.cookie, { beverageId: id });
    await call(beverage.PATCH, { method: "PATCH", cookie: u.cookie, params: { id }, body: { name: "Riesling", abv: 13 } });
    await call(beverage.DELETE, { method: "DELETE", cookie: u.cookie, params: { id } });
    const stored = await call(entry.GET, { cookie: u.cookie, params: { id: (logged.json.entry as { id: string }).id } });
    expect(stored.json.entry).toMatchObject({ beverageName: "Weißwein", abv: 11 });
  });

  it("Bearbeiten und Löschen inkl. Neuberechnung; fremde Einträge nicht zugreifbar (IDOR)", async () => {
    const a = await onboardedUser();
    const b = await onboardedUser();
    const res = await logEntry(a.cookie, { beverageId: await beverageId("Sekt") });
    const id = (res.json.entry as { id: string }).id;
    const upd = await call(entry.PATCH, { method: "PATCH", cookie: a.cookie, params: { id }, body: { servings: 3 } });
    expect((upd.json.entry as { alcoholGrams: number }).alcoholGrams).toBeCloseTo(26.04, 2);

    expect((await call(entry.GET, { cookie: b.cookie, params: { id } })).status).toBe(404);
    expect((await call(entry.PATCH, { method: "PATCH", cookie: b.cookie, params: { id }, body: { servings: 1 } })).status).toBe(404);
    expect((await call(entry.DELETE, { method: "DELETE", cookie: b.cookie, params: { id } })).status).toBe(404);
    const hist = await call(entries.GET, { cookie: b.cookie });
    expect(hist.json.total).toBe(0);

    expect((await call(entry.DELETE, { method: "DELETE", cookie: a.cookie, params: { id } })).status).toBe(200);
    expect(await prisma.consumptionEntry.count()).toBe(0);
    const actions = (await prisma.auditLog.findMany({ where: { actorId: a.id, action: { startsWith: "entry." } } })).map((l) => l.action);
    expect(actions.sort()).toEqual(["entry.created", "entry.deleted", "entry.updated"]);
  });

  it("lehnt Zeitpunkte in der Zukunft und ungültige Zeitzonen ab", async () => {
    const u = await onboardedUser();
    const bier = await beverageId("Bier klein");
    expect((await logEntry(u.cookie, { beverageId: bier, consumedAtLocal: nowLocal(120) })).status).toBe(400);
    expect((await logEntry(u.cookie, { beverageId: bier, timezone: "Nowhere/City" })).status).toBe(400);
    expect((await logEntry(u.cookie, { beverageId: bier, servings: 0 })).status).toBe(400);
  });

  it("CSRF: ändernde Anfragen fremder Herkunft werden abgelehnt", async () => {
    const u = await onboardedUser();
    const res = await call(entries.POST, {
      method: "POST",
      cookie: u.cookie,
      origin: "https://evil.example",
      body: { beverageId: await beverageId("Sekt"), servings: 1, consumedAtLocal: nowLocal(-1), timezone: "Europe/Berlin" },
    });
    expect(res.status).toBe(403);
    expect(await prisma.auditLog.count({ where: { action: "security.csrf_blocked" } })).toBe(1);
    const noOrigin = await call(entries.POST, { method: "POST", cookie: u.cookie, origin: null, body: {} });
    expect(noOrigin.status).toBe(403);
  });
});

describe("Kalender, Statistik und Schätzung", () => {
  it("liefern echte, nach lokalen Tagen gruppierte Daten", async () => {
    const u = await onboardedUser();
    const bier = await beverageId("Bier 0,5 l");
    await logEntry(u.cookie, { beverageId: bier, consumedAtLocal: nowLocal(-30) });
    await logEntry(u.cookie, { beverageId: bier, consumedAtLocal: nowLocal(-20) });
    const today = nowLocal(-20).slice(0, 10);

    const month = await call(calendar.GET, { cookie: u.cookie, query: { month: today.slice(0, 7) } });
    expect(month.status).toBe(200);
    const day = (month.json.days as { day: string; grams: number; drinks: number }[]).find((d) => d.day === today)!;
    expect(day.drinks).toBe(2);
    expect(day.grams).toBeCloseTo(39.46, 2);

    const detail = await call(calendarDay.GET, { cookie: u.cookie, query: { day: today } });
    expect((detail.json.entries as unknown[]).length).toBe(2);
    expect((detail.json.curve as { status: string }).status).toBe("ok");

    const stats = await call(statistics.GET, { cookie: u.cookie, query: { period: "7d" } });
    expect((stats.json.totals as { grams: number; drinks: number }).drinks).toBe(2);
    expect((stats.json.byDay as unknown[]).length).toBe(7);
    expect((stats.json.byCategory as { category: string }[])[0].category).toBe("BEER");

    const est = await call(estimate.GET, { cookie: u.cookie });
    const e = est.json.estimate as { status: string; current: number; zeroAt: string };
    expect(e.status).toBe("ok");
    expect(e.current).toBeGreaterThan(0);
    expect(new Date(e.zeroAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("ungültige Parameter werden abgelehnt, leere Zeiträume liefern Nullsummen ohne Fehler", async () => {
    const u = await onboardedUser();
    expect((await call(calendar.GET, { cookie: u.cookie, query: { month: "2026-13" } })).status).toBe(400);
    expect((await call(calendarDay.GET, { cookie: u.cookie, query: { day: "gestern" } })).status).toBe(400);
    const stats = await call(statistics.GET, { cookie: u.cookie, query: { period: "prev-month" } });
    expect((stats.json.totals as { drinks: number }).drinks).toBe(0);
    const est = await call(estimate.GET, { cookie: u.cookie });
    expect((est.json.estimate as { status: string }).status).toBe("no_data");
  });

  it("Pagination und Filter im Verlauf", async () => {
    const u = await onboardedUser();
    const bier = await beverageId("Bier klein");
    const sekt = await beverageId("Sekt");
    for (let i = 0; i < 12; i++) await logEntry(u.cookie, { beverageId: i % 3 === 0 ? sekt : bier, consumedAtLocal: nowLocal(-(i + 1) * 3) });
    const p1 = await call(entries.GET, { cookie: u.cookie, query: { pageSize: "5", page: "1" } });
    expect(p1.json).toMatchObject({ total: 12, pages: 3 });
    expect((p1.json.items as unknown[]).length).toBe(5);
    const filtered = await call(entries.GET, { cookie: u.cookie, query: { beverageId: sekt } });
    expect(filtered.json.total).toBe(4);
  });
});

describe("Zeitstempel in der Datenbank", () => {
  it("werden als korrekter absoluter Zeitpunkt gespeichert – unabhängig von der Server-Zeitzone", async () => {
    const pg = await import("pg");
    const u = await onboardedUser();
    const res = await logEntry(u.cookie, { beverageId: await beverageId("Sekt"), consumedAtLocal: "2026-01-15T20:00" });
    expect(res.status).toBe(201);
    // Direkt mit der Standard-Zeitzone des Servers lesen (ohne die UTC-Option der App)
    const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query(
      `SELECT extract(epoch FROM "consumedAt")::bigint AS e, current_setting('TimeZone') AS tz FROM consumption_entry WHERE id = $1`,
      [(res.json.entry as { id: string }).id],
    );
    await client.end();
    // 15.01.2026 20:00 in Berlin = 19:00 UTC
    expect(Number(rows[0].e)).toBe(Date.UTC(2026, 0, 15, 19, 0) / 1000);
  });
});
