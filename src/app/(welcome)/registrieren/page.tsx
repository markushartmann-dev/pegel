import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageUser } from "@/server/page-auth";
import { env } from "@/server/env";
import { prisma } from "@/server/db";
import { RegisterForm } from "@/features/auth/register-form";
import { WelcomeIntro } from "@/features/auth/welcome-intro";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage() {
  if (await getPageUser()) redirect("/dashboard");
  const firstUser = (await prisma.user.count()) === 0;
  const closed = !env.registrationEnabled && !firstUser;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
      <WelcomeIntro />
      <div id="konto" className="card scroll-mt-4 p-6 lg:sticky lg:top-8">
        {closed ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Registrierung geschlossen</h2>
            <Alert tone="info">Neue Konten legt die Administration an. Melde dich bei ihr, um einen Einladungslink zu bekommen.</Alert>
            <Link href="/anmelden" className="text-sm text-primary hover:underline">
              Zur Anmeldung
            </Link>
          </div>
        ) : (
          <RegisterForm firstUser={firstUser} mailEnabled={env.mailEnabled} />
        )}
      </div>
    </div>
  );
}
