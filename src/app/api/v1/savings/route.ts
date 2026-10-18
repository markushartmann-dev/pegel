import { route } from "@/server/http";
import { userSavings } from "@/server/services/savings";

export const GET = route({ access: "onboarded", activity: false }, async ({ user }) => {
  return { savings: await userSavings(user) };
});
