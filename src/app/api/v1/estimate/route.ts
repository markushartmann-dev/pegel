import { route } from "@/server/http";
import { currentEstimate } from "@/server/services/estimate";

export const GET = route({ access: "onboarded", activity: false }, async ({ user }) => ({ estimate: await currentEstimate(user) }));
