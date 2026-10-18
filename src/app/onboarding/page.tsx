import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/page-auth";
import { OnboardingWizard } from "@/features/profile/onboarding-wizard";
import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/components/layout/nav";

export const metadata: Metadata = { title: "Einrichtung" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.onboardingCompleted) redirect("/dashboard");
  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="size-9" />
            <div>
              <p className="font-semibold">Willkommen, {user.name}!</p>
              <p className="text-sm text-fg-muted">Noch drei kurze Schritte bis zur ersten Erfassung.</p>
            </div>
          </div>
          <div className="w-36">
            <LogoutButton />
          </div>
        </header>
        <main id="inhalt">
          <OnboardingWizard initialTimezone={user.timezone} initialScheme={user.colorScheme} initialMode={user.themeMode} />
        </main>
      </div>
    </div>
  );
}
