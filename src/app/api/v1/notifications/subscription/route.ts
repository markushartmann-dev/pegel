import { route } from "@/server/http";
import { subscribe, unsubscribe } from "@/server/services/notifications";

export const POST = route({ access: "user", rateLimit: { name: "push-sub", max: 20, windowMs: 60_000 } }, async ({ user, req }) => {
  await subscribe(user, await req.json().catch(() => ({})), req.headers);
  return { ok: true };
});

export const DELETE = route({ access: "user" }, async ({ user, req }) => {
  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  await unsubscribe(user, typeof body.endpoint === "string" ? body.endpoint : null, req.headers);
  return { ok: true };
});
