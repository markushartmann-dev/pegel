import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageUser } from "@/server/page-auth";
import { env } from "@/server/env";
import { prisma } from "@/server/db";
import { RegisterForm } from "@/features/auth/register-form";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage() {
  if (await getPageUser()) redirect("/dashboard");
  const firstUser = (await prisma.user.count()) === 0;
  if (!env.registrationEnabled && !firstUser) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Registrierung geschlossen</h2>
        <Alert tone="info">Neue Konten können derzeit nur von der Administration freigeschaltet werden.</Alert>
        <Link href="/anmelden" className="text-sm text-primary hover:underline">
          Zur Anmeldung
        </Link>
      </div>
    );
  }
  return <RegisterForm firstUser={firstUser} mailEnabled={env.mailEnabled} />;
}
