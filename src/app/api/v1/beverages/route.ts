import { route } from "@/server/http";
import { createBeverage, listBeverages } from "@/server/services/beverages";

export const GET = route({ access: "onboarded", activity: false }, async ({ user, req }) => ({
  beverages: await listBeverages(user.id, { includeArchived: new URL(req.url).searchParams.get("archiviert") === "1" }),
}));

export const POST = route(
  { access: "onboarded", rateLimit: { name: "beverage-write", max: 60, windowMs: 60_000 } },
  async ({ user, req }) => ({
    beverage: await createBeverage(user, await req.json().catch(() => ({})), req.headers),
  }),
);
