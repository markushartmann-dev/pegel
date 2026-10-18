import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/password-forms";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Neues Passwort" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (!token || error) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Link ungültig</h2>
        <Alert tone="danger">Der Link zum Zurücksetzen ist ungültig oder abgelaufen.</Alert>
        <Link href="/passwort-vergessen" className="text-sm text-primary hover:underline">
          Neuen Link anfordern
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
