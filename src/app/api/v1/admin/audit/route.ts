import { route } from "@/server/http";
import { auditLogPage } from "@/server/services/admin";

export const GET = route({ access: "admin", activity: false }, async ({ req }) =>
  auditLogPage(Object.fromEntries(new URL(req.url).searchParams.entries())),
);
