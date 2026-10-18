import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/page-auth";
import { listUsers, systemOverview } from "@/server/services/admin";
import { Badge, Button, Card, Field, Input, LinkButton, Pagination, Select, Stat } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { CreateUserButton } from "@/features/admin/create-user";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const query = {
    q: sp.q || undefined,
    status: sp.status === "ACTIVE" || sp.status === "DEACTIVATED" ? sp.status : undefined,
    role: sp.rolle === "USER" || sp.rolle === "ADMIN" ? sp.rolle : undefined,
    page: sp.seite ?? "1",
  };
  const [data, overview] = await Promise.all([listUsers(query), systemOverview()]);
  const tz = admin.timezone;
  const dt = (d: Date | null) => (d ? formatDateTime(d, tz) : "–");
  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    if (query.q) u.set("q", query.q);
    if (query.status) u.set("status", query.status);
    if (query.role) u.set("rolle", query.role);
    u.set("seite", String(p));
    return `/admin?${u}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Benutzer" value={overview.users} sub={`${overview.active} aktiv · ${overview.admins} Admin(s)`} />
        <Stat label="Konsumeinträge" value={overview.entries} />
        <Stat label="Sicherheitsereignisse (24 h)" value={overview.security24h} sub={<Link href="/admin/protokoll?severity=SECURITY" className="underline">anzeigen</Link>} />
        <Stat label="Fehler (24 h)" value={overview.errors24h} sub={`E-Mail: ${overview.mailEnabled ? "aktiv" : "nicht konfiguriert"} · Push: ${overview.pushEnabled ? "aktiv" : "nicht konfiguriert"}`} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Benutzer</h2>
          <CreateUserButton mailHint={overview.mailEnabled} />
        </div>
        <form method="get" className="mb-4 grid gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="Suche" htmlFor="q">
            <Input id="q" name="q" defaultValue={query.q} placeholder="Name oder E-Mail" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={query.status ?? ""}>
              <option value="">Alle</option>
              <option value="ACTIVE">Aktiv</option>
              <option value="DEACTIVATED">Deaktiviert</option>
            </Select>
          </Field>
          <Field label="Rolle" htmlFor="rolle">
            <Select id="rolle" name="rolle" defaultValue={query.role ?? ""}>
              <option value="">Alle</option>
              <option value="USER">Benutzer</option>
              <option value="ADMIN">Administrator</option>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Filtern
            </Button>
            <LinkButton href="/admin" variant="outline">
              Zurücksetzen
            </LinkButton>
          </div>
        </form>

        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">Benutzerübersicht</caption>
            <thead className="text-left text-xs text-fg-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium sm:px-2">Benutzer</th>
                <th className="px-2 py-2 font-medium">Status / Rolle</th>
                <th className="px-2 py-2 font-medium">Registriert</th>
                <th className="px-2 py-2 font-medium">Letzter Login</th>
                <th className="px-2 py-2 font-medium">Letzte Aktivität</th>
                <th className="px-2 py-2 font-medium">Letzter Logout</th>
                <th className="px-2 py-2 font-medium">Profiländerung</th>
                <th className="px-2 py-2 text-right font-medium">Einträge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2.5 sm:px-2">
                    <Link href={`/admin/benutzer/${u.id}`} className="font-medium text-primary hover:underline">
                      {u.name}
                    </Link>
                    <div className="text-xs text-fg-muted">{u.email}</div>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{u.status === "ACTIVE" ? "aktiv" : "deaktiviert"}</Badge>
                      {u.role === "ADMIN" && <Badge tone="primary">Admin</Badge>}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-xs tabular">{dt(u.createdAt)}</td>
                  <td className="px-2 py-2.5 text-xs tabular">{dt(u.lastLoginAt)}</td>
                  <td className="px-2 py-2.5 text-xs tabular">{dt(u.lastActiveAt)}</td>
                  <td className="px-2 py-2.5 text-xs tabular">{dt(u.lastLogoutAt)}</td>
                  <td className="px-2 py-2.5 text-xs tabular">{dt(u.profileUpdatedAt)}</td>
                  <td className="px-2 py-2.5 text-right tabular">{u._count.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.users.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">Keine Benutzer gefunden.</p>}
        <Pagination page={data.page} pages={data.pages} hrefFor={hrefFor} />
      </Card>
    </div>
  );
}
