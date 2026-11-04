import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as timezoneRoute from "@/app/api/v1/me/timezone/route";
import * as me from "@/app/api/v1/me/route";
import * as entries from "@/app/api/v1/entries/route";
import * as entry from "@/app/api/v1/entries/[id]/route";
import * as calendarDay from "@/app/api/v1/calendar/day/route";
import * as calendar from "@/app/api/v1/calendar/route";
import * as statistics from "@/app/api/v1/statistics/route";
import * as savingsRoute from "@/app/api/v1/savings/route";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { beverageId, call, onboardedUser, resetDb } from "./helpers";

beforeEach(resetDb);

const BERLIN = "Europe/Berlin";
const LONDON = "Europe/London";
const today = () => dayKey(new Date(), BERLIN);

describe("Zeitzone vom Gerät", () => {
  it("wird übernommen, wenn die Automatik aktiv ist", async () => {
    const u = await onboardedUser();
    const res = await call(timezoneRoute.POST, { method: "POST", cookie: u.cookie, body: { timezone: LONDON } });
    expect(res.json).toMatchObject({ changed: true, timezone: LONDON });
    const again = await call(timezoneRoute.POST, { method: "POST", cookie: u.cookie, body: { timezone: LONDON } });
    expect(again.json).toMatchObject({ changed: false });
    expect((await call(me.GET, { cookie: u.cookie })).json.user).toMatchObject({ timezone: LONDON });
  });

  it("bleibt unverändert, wenn die Automatik abgeschaltet ist", async () => {
    const u = await onboardedUser();
    expect((await call(me.PATCH, { method: "PATCH", cookie: u.cookie, body: { timezoneAuto: false } })).status).toBe(200);
    const res = await call(timezoneRoute.POST, { method: "POST", cookie: u.cookie, body: { timezone: LONDON } });
    expect(res.json).toMatchObject({ changed: false, timezone: BERLIN });
  });

  it("lehnt unbekannte Zeitzonen ab", async () => {
    const u = await onboardedUser();
    expect((await call(timezoneRoute.POST, { method: "POST", cookie: u.cookie, body: { timezone: "Mars/Olymp" } })).status).toBe(400);
  });
});

describe("Einträge auf Reisen", () => {
  it("zählen zum Tag ihrer Ortszeit, auch wenn zu Hause schon der nächste Tag war", async () => {
    const u = await onboardedUser();
    const day = addDays(today(), -3);
    // 23:30 in London = 00:30 am Folgetag in Berlin
    const res = await call(entries.POST, {
      method: "POST",
      cookie: u.cookie,
      body: { beverageId: await beverageId("Sekt"), servings: 1, consumedAtLocal: `${day}T23:30`, timezone: LONDON },
    });
    expect(res.status).toBe(201);
    expect(res.json.entry).toMatchObject({ day, timezone: LONDON });

    const sameDay = await call(calendarDay.GET, { cookie: u.cookie, query: { day } });
    expect((sameDay.json.entries as unknown[]).length).toBe(1);
    const nextDay = await call(calendarDay.GET, { cookie: u.cookie, query: { day: addDays(day, 1) } });
    expect((nextDay.json.entries as unknown[]).length).toBe(0);

    const month = await call(calendar.GET, { cookie: u.cookie, query: { month: day.slice(0, 7) } });
    const stat = (month.json.days as { day: string; drinks: number }[]).find((d) => d.day === day);
    expect(stat?.drinks).toBe(1);

    const stats = await call(statistics.GET, { cookie: u.cookie, query: { period: "custom", from: day, to: day } });
    expect((stats.json.totals as { drinks: number }).drinks).toBe(1);
  });

  it("Sparschwein wertet den Tag am Erfassungsort", async () => {
    const u = await onboardedUser();
    await prisma.user.update({ where: { id: u.id }, data: { createdAt: startOfDay(addDays(today(), -6), BERLIN) } });
    const day = addDays(today(), -3);
    await call(entries.POST, {
      method: "POST",
      cookie: u.cookie,
      body: { beverageId: await beverageId("Sekt"), servings: 1, consumedAtLocal: `${day}T23:30`, timezone: LONDON },
    });
    const res = await call(savingsRoute.GET, { cookie: u.cookie });
    // Gezählt: vor 6 bis vor 1 Tag = 6 Tage; nur der Tag in London fällt weg, der Berliner Folgetag bleibt trocken
    expect(res.json.savings).toMatchObject({ dryDays: 5, currentStreak: 2 });
  });

  it("Zeitzone eines Eintrags lässt sich nachträglich ändern", async () => {
    const u = await onboardedUser();
    const day = addDays(today(), -2);
    const created = await call(entries.POST, {
      method: "POST",
      cookie: u.cookie,
      body: { beverageId: await beverageId("Sekt"), servings: 1, consumedAtLocal: `${day}T21:00`, timezone: BERLIN },
    });
    const { id, consumedAt } = created.json.entry as { id: string; consumedAt: string };
    // Gleicher Zeitpunkt, in London eine Stunde früher
    const res = await call(entry.PATCH, {
      method: "PATCH",
      cookie: u.cookie,
      params: { id },
      body: { consumedAtLocal: `${day}T20:00`, timezone: LONDON },
    });
    expect(res.json.entry).toMatchObject({ consumedAt, timezone: LONDON });
  });
});
