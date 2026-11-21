import { route } from "@/server/http";
import { suggestActivityType, withdrawActivitySuggestion } from "@/server/services/suggestions";

type P = { id: string };

/** Eigene Sportart als Standard-Sportart vorschlagen. */
export const POST = route<P>({ access: "onboarded", rateLimit: { name: "suggest", max: 20, windowMs: 60_000 } }, async ({ user, req, params }) =>
  suggestActivityType(user, params.id, req.headers),
);

/** Offenen Vorschlag zurückziehen. */
export const DELETE = route<P>({ access: "onboarded" }, async ({ user, req, params }) => withdrawActivitySuggestion(user, params.id, req.headers));
