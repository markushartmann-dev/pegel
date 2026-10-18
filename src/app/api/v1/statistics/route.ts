import { route } from "@/server/http";
import { periodStatistics } from "@/server/services/statistics";
import { parsePeriod } from "@/lib/dates";

export const GET = route({ access: "onboarded", activity: false }, async ({ user, req }) => {
  const sp = new URL(req.url).searchParams;
  return periodStatistics(user, parsePeriod(sp.get("period")), {
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
});
