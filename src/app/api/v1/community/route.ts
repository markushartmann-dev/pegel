import { route } from "@/server/http";
import { communityRanking, COMMUNITY_PERIODS, type CommunityPeriod } from "@/server/services/community";
import { savingsRanking } from "@/server/services/savings";

export const GET = route({ access: "onboarded", activity: false }, async ({ user, req }) => {
  const p = new URL(req.url).searchParams.get("period") ?? "week";
  const period = (COMMUNITY_PERIODS as readonly string[]).includes(p) ? (p as CommunityPeriod) : "week";
  const [ranking, savings] = await Promise.all([communityRanking(period, user.id), savingsRanking(period, user.id)]);
  return { ...ranking, savings };
});
