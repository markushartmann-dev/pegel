import type { Metadata } from "next";
import { CalendarRange, CupSoda, Droplet, PlusCircle, TrendingDown, TrendingUp } from "lucide-react";
import { requireOnboardedUser } from "@/server/page-auth";
import { dashboardSummary } from "@/server/services/statistics";
import { currentEstimate } from "@/server/services/estimate";
import { recentEntries } from "@/server/services/entries";
import { userSavings } from "@/server/services/savings";
import { SavingsCard } from "@/features/savings/savings-card";
import { Card, CardHeader, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { DailyLineChart } from "@/components/charts";
import { EstimateCard } from "@/features/estimate/estimate-card";
import { EntryList } from "@/features/consumption/entry-list";
import { countLabel, formatGrams, formatNumber, formatPercent } from "@/i18n";
import type { Comparison } from "@/lib/statistics";
import { zonedParts } from "@/lib/dates";

export const metadata: Metadata = { title: "Übersicht" };

function Trend({ c, label }: { c: Comparison; label: string }) {
  if (c.change === null) return <>{c.previous === 0 && c.current === 0 ? `wie ${label}` : `${label}: keine Einträge`}</>;
  const Icon = c.change > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3" aria-hidden />
      {formatPercent(c.change)} ggü. {label}
    </span>
  );
}

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const [summary, estimate, recent, savings] = await Promise.all([dashboardSummary(user), currentEstimate(user), recentEntries(user, 6), userSavings(user)]);
  const hour = zonedParts(new Date(), user.timezone).hour;
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user.name}`}
        description="Deine dokumentierten Mengen und die Modellschätzung im Überblick."
        actions={
          <LinkButton href="/erfassen">
            <PlusCircle className="size-4" aria-hidden /> Getränk erfassen
          </LinkButton>
        }
      />

      {!summary.hasAnyEntries ? (
        <Card className="mb-6">
          <EmptyState
            icon={<CupSoda className="size-6" />}
            title="Noch keine Einträge"
            action={
              <LinkButton href="/erfassen">
                <PlusCircle className="size-4" aria-hidden /> Erstes Getränk erfassen
              </LinkButton>
            }
          >
            Sobald du Getränke erfasst, erscheinen hier Tageswerte, Trends und die Modellschätzung.
          </EmptyState>
        </Card>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Heute"
            value={formatGrams(summary.today.grams)}
            sub={`${countLabel(summary.today.drinks, "Eintrag", "Einträge")} · ${countLabel(summary.today.servings, "Portion", "Portionen")}`}
            icon={<Droplet className="size-4" />}
            tone="primary"
          />
          <Stat
            label="Letzte 7 Tage"
            value={formatGrams(summary.last7.grams)}
            sub={<Trend c={summary.compare7} label="Vorwoche" />}
            icon={<CalendarRange className="size-4" />}
          />
          <Stat
            label="Letzte 30 Tage"
            value={formatGrams(summary.last30.grams)}
            sub={<Trend c={summary.compare30} label="Vorzeitraum" />}
            icon={<CalendarRange className="size-4" />}
          />
          <Stat
            label="Ø pro Tag (30 T.)"
            value={formatGrams(summary.last30.avgPerDay)}
            sub={`${summary.last30.activeDays} von 30 Tagen mit Einträgen · ${countLabel(summary.last30.servings, "Portion", "Portionen")}`}
            icon={<CupSoda className="size-4" />}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <EstimateCard estimate={estimate} timezone={user.timezone} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SavingsCard savings={savings} />
          <Card>
            <CardHeader
              title="Letzte Einträge"
              action={
                <LinkButton href="/verlauf" variant="ghost" size="sm">
                  Alle
                </LinkButton>
              }
            />
            {recent.length ? <EntryList entries={recent} timezone={user.timezone} /> : <p className="text-sm text-fg-muted">Noch keine Einträge vorhanden.</p>}
          </Card>
        </div>
      </div>

      {summary.hasAnyEntries && (
        <Card className="mt-6">
          <CardHeader
            title="Persönlicher Verlauf – letzte 30 Tage"
            description={`Gramm reinen Alkohols pro Tag · insgesamt ${formatNumber(summary.last30.grams, 1)} g`}
            action={
              <LinkButton href="/statistik" variant="ghost" size="sm">
                Statistik
              </LinkButton>
            }
          />
          <DailyLineChart data={summary.byDay30} />
        </Card>
      )}
    </>
  );
}
