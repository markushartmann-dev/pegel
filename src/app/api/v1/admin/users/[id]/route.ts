import { route } from "@/server/http";
import { deleteUser, updateUser, userDetail } from "@/server/services/admin";

type P = { id: string };

export const GET = route<P>({ access: "admin", activity: false }, async ({ params }) => ({ user: await userDetail(params.id) }));

export const PATCH = route<P>({ access: "admin" }, async ({ user, req, params }) => ({
  user: await updateUser(user, params.id, await req.json().catch(() => ({})), req.headers),
}));

export const DELETE = route<P>({ access: "admin" }, async ({ user, req, params }) => {
  await deleteUser(user, params.id, req.headers);
  return { ok: true };
});
