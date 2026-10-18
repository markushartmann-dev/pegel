import { route } from "@/server/http";
import { systemOverview } from "@/server/services/admin";

export const GET = route({ access: "admin", activity: false }, async () => systemOverview());
