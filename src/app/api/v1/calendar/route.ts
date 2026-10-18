import { z } from "zod";
import { route } from "@/server/http";
import { monthOverview } from "@/server/services/statistics";

const q = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Monat im Format JJJJ-MM angeben.") });

export const GET = route({ access: "onboarded", activity: false }, async ({ user, query }) => monthOverview(user, query(q).month));
