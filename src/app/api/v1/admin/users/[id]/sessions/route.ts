import { route } from "@/server/http";
import { revokeUserSessions } from "@/server/services/admin";

export const DELETE = route<{ id: string }>({ access: "admin" }, async ({ user, req, params }) =>
  revokeUserSessions(user, params.id, req.headers),
);
