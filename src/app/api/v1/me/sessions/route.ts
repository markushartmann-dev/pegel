import { route } from "@/server/http";
import { listOwnSessions, revokeOwnSessions } from "@/server/services/account";

export const GET = route({ access: "user", activity: false }, async ({ user, sessionId }) => ({
  sessions: await listOwnSessions(user, sessionId),
}));

/** DELETE ?id=<sessionId> beendet eine Sitzung, ohne Parameter alle anderen Sitzungen. */
export const DELETE = route({ access: "user" }, async ({ user, sessionId, req }) => {
  const id = new URL(req.url).searchParams.get("id");
  return revokeOwnSessions(user, sessionId, id ?? "others", req.headers);
});
