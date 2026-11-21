import { route } from "@/server/http";
import { weeklyActivity } from "@/server/services/activities";

/** Bewegung der aktuellen Kalenderwoche inkl. Fortschritt zum WHO-Richtwert. */
export const GET = route({ access: "onboarded", activity: false }, async ({ user }) => weeklyActivity(user));
