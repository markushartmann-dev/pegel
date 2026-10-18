"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export function LoginForm({
  next,
  registrationEnabled,
  mailEnabled,
  sessionDays,
  passwordReset,
}: {
  next: string;
  registrationEnabled: boolean;
  mailEnabled: boolean;
  sessionDays: number;
  passwordReset: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      rememberMe: fd.get("remember") === "on",
    });
    if (error) {
      setError(authErrorMessage(error));
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <h2 className="text-lg font-semibold">Anmelden</h2>
      {passwordReset && <Alert tone="success">Dein Passwort wurde geändert. Bitte melde dich neu an.</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="E-Mail-Adresse" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required inputMode="email" />
      </Field>
      <Field label="Passwort" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex items-start gap-2">
        <input id="remember" name="remember" type="checkbox" defaultChecked className="mt-1 size-4 accent-[var(--primary)]" />
        <label htmlFor="remember" className="text-sm">
          Angemeldet bleiben
          <span className="block text-xs text-fg-muted">
            {sessionDays} Tage, verlängert sich bei Nutzung. Ohne Häkchen endet die Sitzung beim Schließen des Browsers.
          </span>
        </label>
      </div>
      <Button type="submit" loading={loading} size="lg">
        Anmelden
      </Button>
      <div className="flex flex-col gap-1 text-center text-sm">
        <Link href="/passwort-vergessen" className="text-fg-muted hover:text-fg">
          Passwort vergessen?{!mailEnabled && " (über die Administration)"}
        </Link>
        <Link href="/registrieren" className="text-fg-muted hover:text-fg">
          Was ist Pegel?
        </Link>
        {registrationEnabled && (
          <p className="text-fg-muted">
            Noch kein Konto?{" "}
            <Link href="/registrieren" className="font-medium text-primary hover:underline">
              Registrieren
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
