import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/page-auth";
import { userDetail } from "@/server/services/admin";
import { AppError } from "@/server/errors";
import { Badge, Card, CardHeader } from "@/components/ui";
import { UserActions } from "@/features/admin/user-actions";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Benutzer" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await userDetail(id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const tz = admin.timezone;
  const dt = (d: Date | null) => (d ? formatDateTime(d, tz) : "–");
  const rows: [string, React.ReactNode][] = [
    ["E-Mail", <>{user.email} {user.emailVerified ? <Badge tone="success">bestätigt</Badge> : <Badge>unbestätigt</Badge>}</>],
    ["Registriert", dt(user.createdAt)],
    ["Letzter erfolgreicher Login", dt(user.lastLoginAt)],
    ["Letzte bekannte Aktivität", dt(user.lastActiveAt)],
    ["Letzter bekannter Logout", dt(user.lastLogoutAt)],
    ["Letzte Profiländerung", dt(user.profileUpdatedAt)],
    ["Zeitzone", user.timezone],
    ["Einrichtung abgeschlossen", user.onboardingCompleted ? "ja" : "nein"],
    ["Community-Teilnahme", user.communityOptIn ? "ja" : "nein"],
    ["Push", user.notificationsEnabled ? `aktiv (${user._count.pushSubscriptions} Gerät/e)` : "aus"],
  ];
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="text-sm text-primary hover:underline">
        ← Zur Benutzerübersicht
      </Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex flex-wrap items-center gap-2">
                {user.name}
                <Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>{user.status === "ACTIVE" ? "aktiv" : "deaktiviert"}</Badge>
                {user.role === "ADMIN" && <Badge tone="primary">Administrator</Badge>}
              </span>
            }
            description="Kontodaten und Aktivitätszeitpunkte. Einzelne Konsumeinträge sind aus Datenschutzgründen nicht einsehbar."
          />
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-fg-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 mb-2 text-sm font-semibold">Statistik (aggregiert)</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-fg-muted">Einträge</dt>
              <dd className="tabular">{user._count.entries}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Eigene Getränke</dt>
              <dd className="tabular">{user._count.beverages}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Erster Eintrag</dt>
              <dd className="tabular">{dt(user.firstEntryAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-muted">Letzter Eintrag</dt>
              <dd className="tabular">{dt(user.lastEntryAt)}</dd>
            </div>
          </dl>
          <h3 className="mt-6 mb-2 text-sm font-semibold">Aktive Sitzungen ({user.sessions.length})</h3>
          <ul className="divide-y divide-border text-sm">
            {user.sessions.map((s) => (
              <li key={s.id} className="py-2">
                <span className="text-xs text-fg-muted">
                  seit {dt(s.createdAt)} · zuletzt {dt(s.updatedAt)} · gültig bis {dt(s.expiresAt)}
                </span>
                <div className="truncate text-xs">{s.userAgent ?? "unbekannt"}</div>
              </li>
            ))}
            {user.sessions.length === 0 && <li className="py-2 text-fg-muted">Keine aktiven Sitzungen.</li>}
          </ul>
          <Link href={`/admin/protokoll?userId=${user.id}`} className="mt-4 inline-block text-sm text-primary hover:underline">
            Protokolleinträge dieses Benutzers →
          </Link>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Aktionen" />
          <UserActions user={{ id: user.id, name: user.name, role: user.role, status: user.status }} isSelf={user.id === admin.id} />
        </Card>
      </div>
    </div>
  );
}
