import { route } from "@/server/http";
import { reviewSuggestion } from "@/server/services/suggestions";

/** Vorschlag freigeben ({ decision: "approve" }) oder ablehnen ({ decision: "reject", note }). */
export const POST = route<{ id: string }>({ access: "admin" }, async ({ user, req, params }) =>
  reviewSuggestion(user, params.id, await req.json().catch(() => ({})), req.headers),
);
