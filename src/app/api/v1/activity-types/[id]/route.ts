import { route } from "@/server/http";
import { updateActivityType } from "@/server/services/activities";

type P = { id: string };

export const PATCH = route<P>(
  { access: "onboarded", rateLimit: { name: "activity-type-write", max: 60, windowMs: 60_000 } },
  async ({ user, req, params }) => ({
    activityType: await updateActivityType(user, params.id, await req.json().catch(() => ({})), req.headers),
  }),
);

/** Archiviert eine Sportart (keine harte Löschung, damit die Historie erhalten bleibt). */
export const DELETE = route<P>({ access: "onboarded" }, async ({ user, req, params }) => ({
  activityType: await updateActivityType(user, params.id, { isActive: false }, req.headers),
}));
