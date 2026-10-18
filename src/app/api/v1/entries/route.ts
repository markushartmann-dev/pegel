import { route } from "@/server/http";
import { createEntry, historyPage } from "@/server/services/entries";

export const GET = route({ access: "onboarded", activity: false }, async ({ user, req }) =>
  historyPage(user, Object.fromEntries(new URL(req.url).searchParams.entries())),
);

export const POST = route(
  { access: "onboarded", rateLimit: { name: "entry-write", max: 120, windowMs: 60_000 } },
  async ({ user, req }) => {
    const result = await createEntry(user, await req.json().catch(() => ({})), req.headers);
    return Response.json(result, { status: result.duplicate ? 200 : 201 });
  },
);
