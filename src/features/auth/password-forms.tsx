"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setLoading(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/passwort-zuruecksetzen" });
    setLoading(false);
    if (error) return setError(authErrorMessage(error));
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">E-Mail unterwegs</h2>
        <Alert tone="success">Falls ein Konto mit dieser Adresse existiert, erhältst du in Kürze einen Link (60 Minuten gültig).</Alert>
        <Link href="/anmelden" className="text-sm text-primary hover:underline">
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Passwort vergessen</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="E-Mail-Adresse" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" loading={loading} size="lg">
        Link anfordern
      </Button>
      <Link href="/anmelden" className="text-center text-sm text-fg-muted hover:text-fg">
        Zurück zur Anmeldung
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 10) return setError("Das Passwort muss mindestens 10 Zeichen lang sein.");
    if (password !== String(fd.get("confirm") ?? "")) return setError("Die Passwörter stimmen nicht überein.");
    setLoading(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      setLoading(false);
      return setError(authErrorMessage(error));
    }
    router.replace("/anmelden?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Neues Passwort festlegen</h2>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="Neues Passwort" htmlFor="password" hint="Mindestens 10 Zeichen.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Passwort wiederholen" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Alert tone="info">Nach dem Zurücksetzen werden alle bestehenden Sitzungen beendet.</Alert>
      <Button type="submit" loading={loading} size="lg">
        Passwort speichern
      </Button>
    </form>
  );
}
