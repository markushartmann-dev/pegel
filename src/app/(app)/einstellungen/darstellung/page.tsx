import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/page-auth";
import { AppearanceSettings } from "@/features/settings/appearance-settings";

export const metadata: Metadata = { title: "Darstellung" };

export default async function AppearancePage() {
  const user = await requireOnboardedUser();
  return <AppearanceSettings scheme={user.colorScheme} mode={user.themeMode} />;
}
