import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/page-auth";
import { auditLogPage } from "@/server/services/admin";
import { Badge, Button, Card, Field, Input, LinkButton, Pagination, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Aktivitätsprotokoll" };

const ACTION_LABELS: Record<string, string> = {
  "auth.register": "Registrierung",
  "auth.login": "Login",
  "auth.login_failed": "Login fehlgeschlagen",
  "auth.login_blocked": "Login blockiert",
  "auth.logout": "Logout",
  "auth.password_changed": "Passwort geändert",
  "auth.password_reset_requested": "Passwort-Reset angefordert",
  "auth.password_reset": "Passwort zurückgesetzt",
  "auth.email_verified": "E-Mail bestätigt",
  "auth.sessions_revoked": "Sitzungen beendet (selbst)",
  "profile.onboarding_completed": "Einrichtung abgeschlossen",
  "profile.updated": "Profil geändert",
  "settings.updated": "Einstellungen geändert",
  "community.updated": "Community-Einstellung geändert",
  "beverage.created": "Getränk angelegt",
  "beverage.updated": "Getränk geändert",
  "beverage.archived": "Getränk archiviert",
  "beverage.restored": "Getränk wiederhergestellt",
  "entry.created": "Eintrag erfasst",
  "entry.updated": "Eintrag geändert",
  "entry.deleted": "Eintrag gelöscht",
  "push.subscribed": "Push aktiviert",
  "push.unsubscribed": "Push deaktiviert",
  "push.subscription_removed": "Push-Abo entfernt (abgelaufen)",
  "account.exported": "Datenexport",
  "account.deleted": "Konto selbst gelöscht",
  "admin.user_status_changed": "Admin: Status geändert",
  "admin.user_role_changed": "Admin: Rolle geändert",
  "admin.sessions_revoked": "Admin: Sitzungen beendet",
  "admin.user_deleted": "Admin: Konto gelöscht",
  "admin.reset_link_created": "Admin: Reset-Link erzeugt",
  "admin.default_beverage_changed": "Admin: Standardgetränk geändert",
  "security.csrf_blocked": "CSRF-Anfrage blockiert",
  "security.rate_limited": "Rate-Limit ausgelöst",
  "security.forbidden": "Unberechtigter Zugriff",
  "system.error": "Systemfehler",
};

const TONE = { INFO: "neutral", WARNING: "warning", SECURITY: "primary", ERROR: "danger" } as const;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = {
    q: sp.q || undefined,
    severity: sp.severity && ["INFO", "WARNING", "SECURITY", "ERROR"].includes(sp.severity) ? sp.severity : undefined,
    userId: sp.userId || undefined,
    page: sp.seite ?? "1",
  };
  const data = await auditLogPage(q);
  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    if (q.q) u.set("q", q.q);
    if (q.severity) u.set("severity", q.severity);
    if (q.userId) u.set("userId", q.userId);
    u.set("seite", String(p));
    return `/admin/protokoll?${u}`;
  };
  const who = (u: { id: string; name: string; email: string } | null, deletedFallback: boolean) =>
    u ? (
      <Link href={`/admin/benutzer/${u.id}`} className="text-primary hover:underline">
        {u.name}
      </Link>
    ) : deletedFallback ? (
      <span className="text-fg-muted">gelöscht/unbekannt</span>
    ) : (
      <span className="text-fg-muted">–</span>
    );

  return (
    <Card>
      <form method="get" className="mb-4 grid gap-3 sm:grid-cols-4 sm:items-end">
        <Field label="Aktion enthält" htmlFor="q">
          <Input id="q" name="q" defaultValue={q.q} placeholder="z. B. login" />
        </Field>
        <Field label="Schweregrad" htmlFor="severity">
          <Select id="severity" name="severity" defaultValue={q.severity ?? ""}>
            <option value="">Alle</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warnung</option>
            <option value="SECURITY">Sicherheit</option>
            <option value="ERROR">Fehler</option>
          </Select>
        </Field>
        {q.userId && <input type="hidden" name="userId" value={q.userId} />}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">Filtern</Button>
          <LinkButton href="/admin/protokoll" variant="outline">
            Zurücksetzen
          </LinkButton>
        </div>
      </form>
      {q.userId && <p className="mb-3 text-sm text-fg-muted">Gefiltert auf einen Benutzer.</p>}
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">Aktivitätsprotokoll</caption>
          <thead className="text-left text-xs text-fg-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2 font-medium sm:px-2">Zeitpunkt ({admin.timezone})</th>
              <th className="px-2 py-2 font-medium">Ereignis</th>
              <th className="px-2 py-2 font-medium">Ausgelöst von</th>
              <th className="px-2 py-2 font-medium">Betroffen</th>
              <th className="px-2 py-2 font-medium">Herkunft</th>
              <th className="px-2 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2 text-xs whitespace-nowrap tabular sm:px-2">{formatDateTime(e.createdAt, admin.timezone)}</td>
                <td className="px-2 py-2">
                  <Badge tone={TONE[e.severity]}>{e.severity}</Badge> <span className="ml-1">{ACTION_LABELS[e.action] ?? e.action}</span>
                </td>
                <td className="px-2 py-2 text-xs">{who(e.actor, !!e.actorId || e.action === "account.deleted")}</td>
                <td className="px-2 py-2 text-xs">{who(e.targetUser, false)}</td>
                <td className="px-2 py-2 text-xs text-fg-muted">{e.ipAddress ?? "–"}</td>
                <td className="max-w-64 truncate px-2 py-2 font-mono text-[11px] text-fg-muted" title={e.metadata ? JSON.stringify(e.metadata) : undefined}>
                  {e.metadata ? JSON.stringify(e.metadata) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.items.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">Keine Einträge gefunden.</p>}
      <Pagination page={data.page} pages={data.pages} hrefFor={hrefFor} />
      <p className="mt-4 text-xs text-fg-muted">
        Zeitstempel werden in UTC gespeichert. IP-Adressen sind gekürzt. Passwörter, Tokens und Konsumdetails werden nicht protokolliert.
      </p>
    </Card>
  );
}
