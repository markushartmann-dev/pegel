import { z } from "zod";
import { route } from "@/server/http";
import { syncDeviceTimezone } from "@/server/services/account";
import { timezoneSchema } from "@/lib/validation";

const schema = z.object({ timezone: timezoneSchema });

/** Vom Gerät erkannte Zeitzone melden. Zählt nicht als Benutzeraktivität. */
export const POST = route(
  { access: "user", activity: false, rateLimit: { name: "timezone-sync", max: 20, windowMs: 60_000 } },
  async ({ user, req, body }) => syncDeviceTimezone(user, (await body(schema)).timezone, req.headers),
);
