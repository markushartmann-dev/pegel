import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPageUser } from "@/server/page-auth";
import { env } from "@/server/env";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ weiter?: string; reset?: string }> }) {
  if (await getPageUser()) redirect("/dashboard");
  const sp = await searchParams;
  // Nur interne Pfade als Weiterleitungsziel akzeptieren (Schutz vor Open Redirect)
  const next = sp.weiter && sp.weiter.startsWith("/") && !sp.weiter.startsWith("//") ? sp.weiter : "/dashboard";
  return (
    <LoginForm
      next={next}
      registrationEnabled={env.registrationEnabled}
      mailEnabled={env.mailEnabled}
      sessionDays={env.sessionMaxAgeDays}
      passwordReset={sp.reset === "1"}
    />
  );
}
