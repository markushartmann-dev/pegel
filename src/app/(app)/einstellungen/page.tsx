import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/page-auth";
import { getProfile } from "@/server/services/profile";
import { ProfileSettings } from "@/features/settings/profile-settings";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfileSettingsPage() {
  const user = await requireOnboardedUser();
  const profile = await getProfile(user.id);
  return (
    <ProfileSettings
      name={user.name}
      email={user.email}
      timezone={user.timezone}
      profile={
        profile
          ? {
              gender: profile.gender,
              distributionModel: profile.distributionModel,
              customFactor: profile.customFactor !== null ? String(profile.customFactor).replace(".", ",") : "0,6",
              weightKg: String(profile.weightKg).replace(".", ","),
              heightCm: String(profile.heightCm),
            }
          : null
      }
    />
  );
}
