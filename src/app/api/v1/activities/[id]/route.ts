import { route } from "@/server/http";
import { deleteActivity, getActivity, updateActivity } from "@/server/services/activities";

type P = { id: string };
const writeLimit = { name: "activity-write", max: 120, windowMs: 60_000 };

export const GET = route<P>({ access: "onboarded", activity: false }, async ({ user, params }) => ({
  entry: await getActivity(user, params.id),
}));

export const PATCH = route<P>({ access: "onboarded", rateLimit: writeLimit }, async ({ user, req, params }) => ({
  entry: await updateActivity(user, params.id, await req.json().catch(() => ({})), req.headers),
}));

export const DELETE = route<P>({ access: "onboarded", rateLimit: writeLimit }, async ({ user, req, params }) => {
  await deleteActivity(user, params.id, req.headers);
  return { ok: true };
});
