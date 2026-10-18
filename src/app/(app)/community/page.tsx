import type { Metadata } from "next";
import Link from "next/link";
import { Flame, PiggyBank, Users } from "lucide-react";
import { requireOnboardedUser } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { communityRanking, COMMUNITY_PERIODS, type CommunityPeriod } from "@/server/services/community";
import { savingsRanking, userSavings } from "@/server/services/savings";
import { SavingsCard } from "@/features/savings/savings-card";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, SegmentedLinks } from "@/components/ui";
import { RankingBarChart, ShareDonut } from "@/components/charts";
import { CommunitySettings } from "@/features/community/community-settings";
import { formatEuro, formatGrams, formatNumber } from "@/i18n";

export const metadata: Metadata = { title: "Community" };

const LABELS: Record<CommunityPeriod, string> = { week: "Letzte Woche", month: "Letzter Monat", all: "Gesamt" };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string }> }) {
  const user = await requireOnboardedUser();
  const { zeitraum } = await searchParams;
  const period: CommunityPeriod = (COMMUNITY_PERIODS as readonly string[]).includes(zeitraum ?? "") ? (zeitraum as CommunityPeriod) : "week";
  const [settings, ranking, savingsTop, ownSavings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { communityOptIn: true, communityDisplay: true, communityPseudonym: true } }),
    communityRanking(period, user.id),
    savingsRanking(period, user.id),
    userSavings(user),
  ]);
  const pie = [...ranking.top.map((r) => ({ name: r.label, value: r.grams })), ...(ranking.rest ? [{ name: `Weitere (${ranking.rest.count})`, value: ranking.rest.grams }] : [])];

  return (
    <>
      <PageHeader title="Community" description="Sparschwein und Vergleich der dokumentierten Mengen zwischen Teilnehmenden dieser App." />
      <Alert tone="info" className="mb-6">
        Die Statistik ist nur für angemeldete Benutzer dieser Installation sichtbar und wird nicht veröffentlicht. Sie zeigt ausschließlich erfasste
        Mengen – nicht den tatsächlichen Alkoholkonsum. Teilnehmende ohne Einträge im Zeitraum erscheinen nicht; gelöschte Konten und widerrufene
        Teilnahmen werden sofort entfernt.
      </Alert>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SegmentedLinks
            label="Zeitraum"
            active={period}
            items={COMMUNITY_PERIODS.map((p) => ({ value: p, label: LABELS[p], href: `/community?zeitraum=${p}` }))}
          />
          <Card>
            <CardHeader
              icon={<PiggyBank className="size-5" />}
              title="Sparschwein-Ranking"
              description={
                period === "all"
                  ? "Gesamt seit der Registrierung · Tage ohne erfasste Getränke inkl. Boni"
                  : `Letzte ${period === "week" ? 7 : 30} abgeschlossene Tage · Tage ohne erfasste Getränke inkl. Boni`
              }
            />
            {savingsTop.participants === 0 ? (
              <EmptyState icon={<PiggyBank className="size-6" />} title="Noch niemand dabei">
                Sobald jemand am Community-Ranking teilnimmt, erscheint hier das Sparschwein.
              </EmptyState>
            ) : (
              <>
                <ol className="mb-4 divide-y divide-border">
                  {savingsTop.top.map((r) => (
                    <li key={r.rank} className="flex items-center gap-3 py-2.5">
                      <span className="w-6 text-right text-sm font-semibold text-fg-muted tabular">{r.rank}.</span>
                      <span className="flex-1 truncate text-sm">
                        {r.label} {r.isViewer && <Badge tone="primary">du</Badge>}
                      </span>
                      {r.streak > 0 && (
                        <span className="flex items-center gap-1 text-xs text-fg-muted tabular" title="Aktuelle Serie">
                          <Flame className="size-3 text-warning" aria-hidden />
                          {r.streak} T.
                        </span>
                      )}
                      <span className="w-20 text-right text-sm font-semibold tabular">{formatEuro(r.amount)}</span>
                    </li>
                  ))}
                </ol>
                {savingsTop.total > 0 && (
                  <RankingBarChart
                    unit="eur"
                    data={savingsTop.top.map((r) => ({ name: r.label, grams: r.amount, highlight: r.isViewer }))}
                    height={Math.max(160, savingsTop.top.length * 34)}
                  />
                )}
                <p className="mt-2 text-xs text-fg-muted">Zusammen gespart: {formatEuro(savingsTop.total)}</p>
              </>
            )}
          </Card>
          {ranking.top.length === 0 ? (
            <Card>
              <EmptyState icon={<Users className="size-6" />} title="Noch keine Daten">
                {ranking.participantsTotal === 0
                  ? "Bisher nimmt niemand am Community-Ranking teil."
                  : "Im gewählten Zeitraum haben die Teilnehmenden keine Getränke erfasst."}
              </EmptyState>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader title="Verteilung" description={`Anteil an insgesamt ${formatGrams(ranking.total)} reinem Alkohol · ${ranking.participants} Teilnehmende mit Einträgen`} />
                <ShareDonut data={pie} height={320} label="Kreisdiagramm: Anteil der Teilnehmenden an der Gesamtmenge" />
              </Card>
              <Card>
                <CardHeader title="Top 10" />
                <ol className="mb-4 divide-y divide-border">
                  {ranking.top.map((r) => (
                    <li key={r.rank} className="flex items-center gap-3 py-2.5">
                      <span className="w-6 text-right text-sm font-semibold text-fg-muted tabular">{r.rank}.</span>
                      <span className="flex-1 truncate text-sm">
                        {r.label} {r.isViewer && <Badge tone="primary">du</Badge>}
                      </span>
                      <span className="text-sm tabular text-fg-muted">{formatNumber(r.share * 100, 0)} %</span>
                      <span className="w-20 text-right text-sm font-semibold tabular">{formatGrams(r.grams)}</span>
                    </li>
                  ))}
                </ol>
                <RankingBarChart data={ranking.top.map((r) => ({ name: r.label, grams: r.grams, highlight: r.isViewer }))} height={Math.max(160, ranking.top.length * 34)} />
              </Card>
            </>
          )}
        </div>
        <div className="flex h-fit flex-col gap-6">
        <SavingsCard savings={ownSavings} />
        <Card className="h-fit">
          <CardHeader title="Deine Teilnahme" description="Standardmäßig aktiv (im Onboarding abwählbar). Du kannst jederzeit widerrufen." />
          <CommunitySettings initial={{ optIn: settings.communityOptIn, display: settings.communityDisplay, pseudonym: settings.communityPseudonym ?? "" }} displayName={user.name} />
          <p className="mt-4 text-xs text-fg-muted">
            Mehr dazu in den{" "}
            <Link href="/datenschutz" className="underline">
              Datenschutzhinweisen
            </Link>
            .
          </p>
        </Card>
        </div>
      </div>
    </>
  );
}
