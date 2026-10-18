import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/page-auth";
import { getNotificationSettings, pushConfig } from "@/server/services/notifications";
import { NotificationSettings } from "@/features/notifications/notification-settings";

export const metadata: Metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();
  const [settings, config] = [await getNotificationSettings(user.id), pushConfig()];
  return <NotificationSettings initial={settings} config={config} timezone={user.timezone} />;
}
