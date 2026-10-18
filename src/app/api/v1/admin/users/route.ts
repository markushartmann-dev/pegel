import { route } from "@/server/http";
import { listUsers } from "@/server/services/admin";

export const GET = route({ access: "admin", activity: false }, async ({ req }) =>
  listUsers(Object.fromEntries(new URL(req.url).searchParams.entries())),
);
