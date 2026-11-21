import { route } from "@/server/http";
import { activityHistoryPage, createActivity } from "@/server/services/activities";

export const GET = route({ access: "onboarded", activity: false }, async ({ user, req }) =>
  activityHistoryPage(user, Object.fromEntries(new URL(req.url).searchParams.entries())),
);

export const POST = route(
  { access: "onboarded", rateLimit: { name: "activity-write", max: 120, windowMs: 60_000 } },
  async ({ user, req }) => {
    const result = await createActivity(user, await req.json().catch(() => ({})), req.headers);
    return Response.json(result, { status: result.duplicate ? 200 : 201 });
  },
);
