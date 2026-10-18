import { route } from "@/server/http";
import { createResetLink } from "@/server/services/admin";

export const POST = route<{ id: string }>(
  { access: "admin", rateLimit: { name: "reset-link", max: 10, windowMs: 60_000 } },
  async ({ user, req, params }) => createResetLink(user, params.id, req.headers),
);
