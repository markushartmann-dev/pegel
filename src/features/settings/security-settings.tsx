"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Laptop, Smartphone } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { useToast } from "@/components/ui/client";
import { api } from "@/lib/api-client";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/dates";

type SessionRow = { id: string; createdAt: string; updatedAt: string; expiresAt: string; userAgent: string | null; ipAddress: string | null; current: boolean };

function describeAgent(ua: string | null) {
  if (!ua) return "Unbekanntes Gerät";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` auf ${os}` : ""}`;
}

export function SecuritySettings({ sessions, timezone, sessionDays }: { sessions: SessionRow[]; timezone: string; sessionDays: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    if (next.length < 10) return setPwError("Das neue Passwort muss mindestens 10 Zeichen lang sein.");
    if (next !== String(fd.get("confirm") ?? "")) return setPwError("Die Passwörter stimmen nicht überein.");
    setPwLoading(true);
    setPwError(null);
    const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setPwLoading(false);
    if (error) return setPwError(authErrorMessage(error));
    form.reset();
    toast("Passwort geändert. Alle anderen Sitzungen wurden beendet.");
    router.refresh();
  }

  async function revoke(id?: string) {
    setBusy(id ?? "others");
    try {
      await api(`/api/v1/me/sessions${id ? `?id=${encodeURIComponent(id)}` : ""}`, { method: "DELETE" });
      toast(id ? "Sitzung beendet." : "Alle anderen Sitzungen beendet.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Passwort ändern" description="Nach der Änderung werden alle anderen Sitzungen beendet." />
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <Field label="Aktuelles Passwort" htmlFor="current">
            <Input id="current" name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Neues Passwort" htmlFor="next" hint="Mindestens 10 Zeichen.">
            <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} />
          </Field>
          <Field label="Neues Passwort wiederholen" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          {pwError && <Alert tone="danger">{pwError}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" loading={pwLoading}>
              Passwort ändern
            </Button>
          </div>
        </form>
      </Card>
      <Card>
        <CardHeader
          title="Aktive Sitzungen"
          description={`Mit „Angemeldet bleiben“ gilt eine Sitzung ${sessionDays} Tage und verlängert sich bei Nutzung. Ohne Häkchen endet sie mit dem Browser (serverseitig spätestens nach 24 h).`}
        />
        <ul className="divide-y divide-border">
          {sessions.map((s) => {
            const mobile = /iPhone|Android|iPad/.test(s.userAgent ?? "");
            const Icon = mobile ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <Icon className="size-5 shrink-0 text-fg-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {describeAgent(s.userAgent)} {s.current && <Badge tone="primary">dieses Gerät</Badge>}
                  </p>
                  <p className="text-xs text-fg-muted">
                    Angemeldet {formatDateTime(new Date(s.createdAt), timezone)} · zuletzt aktiv {formatDateTime(new Date(s.updatedAt), timezone)}
                    {s.ipAddress ? ` · ${s.ipAddress}` : ""}
                  </p>
                </div>
                {!s.current && (
                  <Button variant="ghost" size="sm" onClick={() => revoke(s.id)} loading={busy === s.id}>
                    Beenden
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {sessions.length > 1 && (
          <Button variant="outline" className="mt-4" onClick={() => revoke()} loading={busy === "others"}>
            Alle anderen Sitzungen beenden
          </Button>
        )}
      </Card>
    </div>
  );
}
