import { route } from "@/server/http";
import { reviewActivitySuggestion } from "@/server/services/suggestions";

/** Sportart-Vorschlag freigeben ({ decision: "approve" }) oder ablehnen ({ decision: "reject", note }). */
export const POST = route<{ id: string }>({ access: "admin" }, async ({ user, req, params }) =>
  reviewActivitySuggestion(user, params.id, await req.json().catch(() => ({})), req.headers),
);
