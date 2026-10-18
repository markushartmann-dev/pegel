import { route } from "@/server/http";
import { createUser, listUsers } from "@/server/services/admin";

export const GET = route({ access: "admin", activity: false }, async ({ req }) =>
  listUsers(Object.fromEntries(new URL(req.url).searchParams.entries())),
);

export const POST = route({ access: "admin", rateLimit: { name: "admin-create-user", max: 20, windowMs: 60_000 } }, async ({ user, req }) => {
  const result = await createUser(user, await req.json().catch(() => ({})), req.headers);
  return Response.json(result, { status: 201 });
});
