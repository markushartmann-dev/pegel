import { route } from "@/server/http";
import { updateCommunitySettings } from "@/server/services/community";

export const PUT = route({ access: "onboarded" }, async ({ user, req }) => {
  await updateCommunitySettings(user.id, await req.json().catch(() => ({})), req.headers);
  return { ok: true };
});
