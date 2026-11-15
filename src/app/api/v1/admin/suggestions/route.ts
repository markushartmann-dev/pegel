import { route } from "@/server/http";
import { listSuggestions } from "@/server/services/suggestions";

export const GET = route({ access: "admin", activity: false }, async () => ({ suggestions: await listSuggestions() }));
