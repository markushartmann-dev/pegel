import { route } from "@/server/http";
import { getNotificationSettings, pushConfig, updateNotificationSettings } from "@/server/services/notifications";

export const GET = route({ access: "user", activity: false }, async ({ user }) => ({
  config: pushConfig(),
  settings: await getNotificationSettings(user.id),
}));

export const PATCH = route({ access: "user" }, async ({ user, req }) => ({
  settings: await updateNotificationSettings(user, await req.json().catch(() => ({})), req.headers),
}));
