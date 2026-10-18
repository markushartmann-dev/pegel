import { route } from "@/server/http";
import { completeOnboarding } from "@/server/services/profile";

export const POST = route({ access: "user", rateLimit: { name: "onboarding", max: 20, windowMs: 60_000 } }, async ({ user, req }) => {
  await completeOnboarding(user.id, await req.json().catch(() => ({})), req.headers);
  return { ok: true };
});
