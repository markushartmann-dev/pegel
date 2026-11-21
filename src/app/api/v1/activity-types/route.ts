import { route } from "@/server/http";
import { createActivityType, listActivityTypes } from "@/server/services/activities";

export const GET = route({ access: "onboarded", activity: false }, async ({ user, req }) => ({
  activityTypes: await listActivityTypes(user.id, { includeArchived: new URL(req.url).searchParams.get("archiviert") === "1" }),
}));

export const POST = route(
  { access: "onboarded", rateLimit: { name: "activity-type-write", max: 60, windowMs: 60_000 } },
  async ({ user, req }) => ({
    activityType: await createActivityType(user, await req.json().catch(() => ({})), req.headers),
  }),
);
