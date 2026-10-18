import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import * as savingsRoute from "@/app/api/v1/savings/route";
import * as community from "@/app/api/v1/community/route";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { beverageId, call, onboardedUser, resetDb } from "./helpers";

beforeEach(resetDb);

const TZ = "Europe/Berlin";
const today = () => dayKey(new Date(), TZ);

/** Registrierung n Tage zurückdatieren und an den angegebenen Tagen (relativ zu heute) je einen Eintrag anlegen. */
async function setup(userId: string, registeredDaysAgo: number, drinkDaysAgo: number[]) {
  await prisma.user.update({ where: { id: userId }, data: { createdAt: startOfDay(addDays(today(), -registeredDaysAgo), TZ) } });
  const bev = await beverageId("Bier 0,5 l");
  for (const d of drinkDaysAgo) {
    const at = new Date(startOfDay(addDays(today(), -d), TZ).getTime() + 20 * 3_600_000); // 20:00 lokal
    await prisma.consumptionEntry.create({
      data: { userId, beverageId: bev, beverageName: "Bier 0,5 l", category: "BEER", abv: 5, volumeMl: 500, servings: 1, alcoholGrams: 19.73, consumedAt: at, timezone: TZ },
    });
  }
}

describe("Sparschwein", () => {
  it("zählt Tage ohne Eintrag bis gestern inkl. Wochenbonus", async () => {
    const u = await onboardedUser();
    // Registriert vor 10 Tagen → gezählte Tage: vor 10 … vor 1 = 10 Tage; Eintrag vor 9 Tagen
    await setup(u.id, 10, [9]);
    const res = await call(savingsRoute.GET, { cookie: u.cookie });
    expect(res.status).toBe(200);
    const s = res.json.savings as { dryDays: number; currentStreak: number; weekBonuses: number; total: number; todayDry: boolean };
    expect(s.dryDays).toBe(9);
    expect(s.currentStreak).toBe(8);
    expect(s.weekBonuses).toBe(1);
    expect(s.total).toBe(9 * 5 + 10);
    expect(s.todayDry).toBe(true);
  });

  it("Ranking unter Teilnehmenden, Abgemeldete erscheinen nicht", async () => {
    const a = await onboardedUser();
    const b = await onboardedUser();
    const c = await onboardedUser();
    await setup(a.id, 7, []); // 7 Tage trocken → 35 + 10
    await setup(b.id, 7, [1, 3]); // 5 Tage → 25
    await setup(c.id, 7, []);
    await prisma.user.update({ where: { id: c.id }, data: { communityOptIn: false } });

    const res = await call(community.GET, { cookie: b.cookie, query: { period: "week" } });
    const savings = res.json.savings as { participants: number; top: { amount: number; isViewer: boolean; streak: number }[] };
    expect(savings.participants).toBe(2);
    expect(savings.top.map((r) => r.amount)).toEqual([45, 25]);
    expect(savings.top[1].isViewer).toBe(true);
    expect(savings.top[0].streak).toBe(7);
    expect(JSON.stringify(savings)).not.toContain(a.id);
  });
});
