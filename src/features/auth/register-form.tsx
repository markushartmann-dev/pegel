"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export function RegisterForm({ firstUser, mailEnabled }: { firstUser: boolean; mailEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [verifyHint, setVerifyHint] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const f: Record<string, string> = {};
    if (name.length < 2) f.name = "Bitte einen Anzeigenamen mit mindestens 2 Zeichen angeben.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) f.email = "Bitte eine gültige E-Mail-Adresse angeben.";
    if (password.length < 10) f.password = "Mindestens 10 Zeichen.";
    if (password !== confirm) f.confirm = "Die Passwörter stimmen nicht überein.";
    setFields(f);
    if (Object.keys(f).length) return;

    setLoading(true);
    setError(null);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { error } = await authClient.signUp.email({ name, email, password, timezone } as Parameters<typeof authClient.signUp.email>[0]);
    if (error) {
      setError(authErrorMessage(error));
      setLoading(false);
      return;
    }
    if (mailEnabled) {
      setVerifyHint(true);
      setLoading(false);
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  if (verifyHint) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Fast geschafft</h2>
        <Alert tone="success">Wir haben dir eine E-Mail mit einem Bestätigungslink gesendet. Nach der Bestätigung kannst du dich anmelden.</Alert>
        <Link href="/anmelden" className="text-sm text-primary hover:underline">
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <h2 className="text-lg font-semibold">Konto erstellen</h2>
      {firstUser && (
        <Alert tone="info" title="Erste Einrichtung">
          Dies ist das erste Konto dieser Installation. Es erhält automatisch Administratorrechte.
        </Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="Anzeigename" htmlFor="name" error={fields.name}>
        <Input id="name" name="name" autoComplete="nickname" required maxLength={50} aria-invalid={!!fields.name} />
      </Field>
      <Field label="E-Mail-Adresse" htmlFor="email" error={fields.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fields.email} />
      </Field>
      <Field label="Passwort" htmlFor="password" error={fields.password} hint="Mindestens 10 Zeichen. Eine Passphrase aus mehreren Wörtern ist sicher und gut merkbar.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} aria-invalid={!!fields.password} />
      </Field>
      <Field label="Passwort wiederholen" htmlFor="confirm" error={fields.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!fields.confirm} />
      </Field>
      <p className="text-xs text-fg-muted">
        Mit der Registrierung bestätigst du, die{" "}
        <Link href="/datenschutz" className="underline">
          Datenschutzhinweise
        </Link>{" "}
        gelesen zu haben. Die Einwilligung zur Verarbeitung deiner Konsumdaten erteilst du im nächsten Schritt.
      </p>
      <Button type="submit" loading={loading} size="lg">
        Registrieren
      </Button>
      <p className="text-center text-sm text-fg-muted">
        Bereits registriert?{" "}
        <Link href="/anmelden" className="font-medium text-primary hover:underline">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
