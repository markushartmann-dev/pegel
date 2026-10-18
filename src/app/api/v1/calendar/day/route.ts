import { z } from "zod";
import { route } from "@/server/http";
import { entriesForDay } from "@/server/services/entries";
import { dayCurve } from "@/server/services/estimate";
import { dayKeySchema } from "@/lib/validation";

const q = z.object({ day: dayKeySchema });

export const GET = route({ access: "onboarded", activity: false }, async ({ user, query }) => {
  const { day } = query(q);
  const [entries, curve] = await Promise.all([entriesForDay(user, day), dayCurve(user, day)]);
  return { day, entries, curve };
});
