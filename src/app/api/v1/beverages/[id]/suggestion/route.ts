import { route } from "@/server/http";
import { suggestBeverage, withdrawSuggestion } from "@/server/services/suggestions";

type P = { id: string };

/** Eigenes Getränk als Standardgetränk vorschlagen. */
export const POST = route<P>({ access: "onboarded", rateLimit: { name: "suggest", max: 20, windowMs: 60_000 } }, async ({ user, req, params }) =>
  suggestBeverage(user, params.id, req.headers),
);

/** Offenen Vorschlag zurückziehen. */
export const DELETE = route<P>({ access: "onboarded" }, async ({ user, req, params }) => withdrawSuggestion(user, params.id, req.headers));
