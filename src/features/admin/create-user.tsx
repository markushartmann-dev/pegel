"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { Dialog, useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";

type Result = { user: { name: string; email: string }; setupUrl: string | null; setupValidDays: number | null };

function randomPassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function CreateUserButton({ mailHint }: { mailHint: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "password">("link");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
    setFields({});
    setPassword("");
    setMode("link");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    setFields({});
    try {
      const r = await api<Result>("/api/v1/admin/users", {
        method: "POST",
        body: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          role: String(fd.get("role") ?? "USER"),
          mode,
          password: mode === "password" ? password : undefined,
        },
      });
      setResult(r);
      router.refresh();
    } catch (err) {
      setError((err as ApiError).message);
      setFields((err as ApiError).fields ?? {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden /> Benutzer anlegen
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={result ? "Konto angelegt" : "Benutzer anlegen"}
        description={result ? `${result.user.name} · ${result.user.email}` : "Funktioniert auch bei geschlossener Registrierung. Die Einrichtung (Profil, Einwilligungen) erledigt die Person beim ersten Login selbst."}
      >
        {result ? (
          <div className="flex flex-col gap-4">
            {result.setupUrl ? (
              <>
                <p className="text-sm text-fg-muted">
                  Gib diesen Einladungslink auf sicherem Weg weiter. Damit legt die Person ihr eigenes Passwort fest. Gültig {result.setupValidDays} Tage, nur
                  einmal verwendbar – er wird nicht erneut angezeigt (bei Bedarf im Benutzerdetail einen neuen Reset-Link erzeugen).
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={result.setupUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Einladungslink" />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Link kopieren"
                    onClick={async () => {
                      await navigator.clipboard.writeText(result.setupUrl ?? "");
                      toast("Link kopiert.");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Alert tone="success">
                Die Person kann sich jetzt mit dem vergebenen Startpasswort anmelden. Empfehle, es danach unter Einstellungen → Sicherheit zu ändern.
              </Alert>
            )}
            <div className="flex justify-end">
              <Button onClick={close}>Fertig</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field label="Anzeigename" htmlFor="cu-name" error={fields.name}>
              <Input id="cu-name" name="name" required maxLength={50} autoFocus />
            </Field>
            <Field label="E-Mail-Adresse" htmlFor="cu-email" error={fields.email} hint={mailHint ? undefined : "Dient als Benutzername für die Anmeldung."}>
              <Input id="cu-email" name="email" type="email" required autoComplete="off" />
            </Field>
            <Field label="Rolle" htmlFor="cu-role">
              <Select id="cu-role" name="role" defaultValue="USER">
                <option value="USER">Benutzer</option>
                <option value="ADMIN">Administrator</option>
              </Select>
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Passwort</legend>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === "link"} onChange={() => setMode("link")} className="mt-0.5 accent-[var(--primary)]" />
                <span>
                  Einladungslink erzeugen (empfohlen)
                  <span className="block text-xs text-fg-muted">Die Person legt ihr Passwort selbst fest – du kennst es nie.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === "password"} onChange={() => setMode("password")} className="mt-0.5 accent-[var(--primary)]" />
                Startpasswort selbst vergeben
              </label>
            </fieldset>
            {mode === "password" && (
              <Field label="Startpasswort" htmlFor="cu-password" error={fields.password} hint="Mindestens 10 Zeichen.">
                <div className="flex gap-2">
                  <Input id="cu-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                  <Button variant="outline" onClick={() => setPassword(randomPassword())}>
                    Erzeugen
                  </Button>
                </div>
              </Field>
            )}
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>
                Abbrechen
              </Button>
              <Button type="submit" loading={loading}>
                Anlegen
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
