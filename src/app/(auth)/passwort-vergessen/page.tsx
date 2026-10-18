import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/server/env";
import { ForgotPasswordForm } from "@/features/auth/password-forms";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  if (!env.mailEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Passwort vergessen</h2>
        <Alert tone="info">
          Auf diesem Server ist kein E-Mail-Versand eingerichtet. Bitte wende dich an die Administration – sie kann dir einen
          einmaligen, 60 Minuten gültigen Link zum Zurücksetzen erzeugen.
        </Alert>
        <Link href="/anmelden" className="text-sm text-primary hover:underline">
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }
  return <ForgotPasswordForm />;
}
