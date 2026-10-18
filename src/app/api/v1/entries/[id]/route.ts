import { route } from "@/server/http";
import { deleteEntry, getEntry, updateEntry } from "@/server/services/entries";

type P = { id: string };
const writeLimit = { name: "entry-write", max: 120, windowMs: 60_000 };

export const GET = route<P>({ access: "onboarded", activity: false }, async ({ user, params }) => ({
  entry: await getEntry(user, params.id),
}));

export const PATCH = route<P>({ access: "onboarded", rateLimit: writeLimit }, async ({ user, req, params }) => ({
  entry: await updateEntry(user, params.id, await req.json().catch(() => ({})), req.headers),
}));

export const DELETE = route<P>({ access: "onboarded", rateLimit: writeLimit }, async ({ user, req, params }) => {
  await deleteEntry(user, params.id, req.headers);
  return { ok: true };
});
