import { route } from "@/server/http";
import { dismissSportNotice } from "@/server/services/activities";

/** Einmaligen Hinweis auf das Sport-Tracking ausblenden. */
export const POST = route({ access: "onboarded" }, async ({ user, req }) => {
  await dismissSportNotice(user, req.headers);
  return { ok: true };
});
