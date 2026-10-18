import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireOnboardedUser } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { Card, CardHeader } from "@/components/ui";
import { DeleteAccount } from "@/features/settings/delete-account";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Daten & Datenschutz" };

const CONSENT_LABELS: Record<string, string> = {
  PRIVACY_NOTICE: "Datenschutzhinweise gelesen",
  HEALTH_DATA_PROCESSING: "Verarbeitung von Konsum- und Körperdaten",
  COMMUNITY_RANKING: "Teilnahme am Community-Ranking",
  PUSH_NOTIFICATIONS: "Push-Benachrichtigungen",
};

export default async function DataPage() {
  const user = await requireOnboardedUser();
  const consents = await prisma.userConsent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Datenexport" description="Alle zu deinem Konto gespeicherten Daten als JSON-Datei (Art. 15 und 20 DSGVO)." />
        <a href="/api/v1/me/export" download className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-primary-fg hover:brightness-110">
          <Download className="size-4" aria-hidden /> Daten herunterladen
        </a>
        <p className="mt-3 text-xs text-fg-muted">Enthält Profil, Profilhistorie, Getränke, Einträge, Einwilligungen, Sitzungs- und Protokollzeitpunkte. Keine Passwort-Hashes oder Tokens.</p>
      </Card>
      <Card>
        <CardHeader title="Einwilligungen" description="Verlauf deiner Entscheidungen (neueste zuerst)." />
        <ul className="divide-y divide-border text-sm">
          {consents.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span>{CONSENT_LABELS[c.type] ?? c.type}</span>
              <span className="text-xs text-fg-muted">
                {c.granted ? "erteilt" : "widerrufen"} · {formatDateTime(c.createdAt, user.timezone)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="lg:col-span-2 border-[color-mix(in_oklab,var(--danger)_35%,var(--border))]">
        <CardHeader
          title="Konto löschen"
          description="Löscht dein Konto mit Profil, Getränken, allen Einträgen, Sitzungen und Push-Abos sofort und endgültig. Protokolleinträge bleiben ohne Bezug zu deiner Person erhalten."
        />
        <DeleteAccount />
      </Card>
    </div>
  );
}
