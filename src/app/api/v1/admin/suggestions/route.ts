import { route } from "@/server/http";
import { listActivitySuggestions, listSuggestions } from "@/server/services/suggestions";

export const GET = route({ access: "admin", activity: false }, async () => ({
  suggestions: await listSuggestions(),
  activitySuggestions: await listActivitySuggestions(),
}));
