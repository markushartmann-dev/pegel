import { route } from "@/server/http";
import { updateProfile } from "@/server/services/profile";

export const PUT = route({ access: "user", rateLimit: { name: "profile", max: 30, windowMs: 60_000 } }, async ({ user, req }) => ({
  profile: await updateProfile(user.id, await req.json().catch(() => ({})), req.headers),
}));
