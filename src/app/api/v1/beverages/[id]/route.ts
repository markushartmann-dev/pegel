import { route } from "@/server/http";
import { archiveBeverage, updateBeverage } from "@/server/services/beverages";

type P = { id: string };

export const PATCH = route<P>(
  { access: "onboarded", rateLimit: { name: "beverage-write", max: 60, windowMs: 60_000 } },
  async ({ user, req, params }) => ({
    beverage: await updateBeverage(user, params.id, await req.json().catch(() => ({})), req.headers),
  }),
);

/** Archiviert ein Getränk (keine harte Löschung, damit die Historie erhalten bleibt). */
export const DELETE = route<P>({ access: "onboarded" }, async ({ user, req, params }) => ({
  beverage: await archiveBeverage(user, params.id, req.headers),
}));
