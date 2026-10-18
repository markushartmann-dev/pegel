import { route } from "@/server/http";
import { getProfile } from "@/server/services/profile";
import { updateSettings } from "@/server/services/account";

export const GET = route({ access: "user", activity: false }, async ({ user }) => ({
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone,
    onboardingCompleted: user.onboardingCompleted,
    themeMode: user.themeMode,
    colorScheme: user.colorScheme,
  },
  profile: await getProfile(user.id),
}));

export const PATCH = route({ access: "user" }, async ({ user, req }) => ({
  settings: await updateSettings(user, await req.json().catch(() => ({})), req.headers),
}));
