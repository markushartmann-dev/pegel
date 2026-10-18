import { route } from "@/server/http";
import { sendTest } from "@/server/services/notifications";

export const POST = route({ access: "user", rateLimit: { name: "push-test", max: 5, windowMs: 60_000 } }, async ({ user }) => ({
  result: await sendTest(user),
}));
