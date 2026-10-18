import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { requireOnboardedUser } from "@/server/page-auth";
import { periodStatistics } from "@/server/services/statistics";
import { Button, Card, CardHeader, EmptyState, Field, Input, LinkButton, PageHeader, SegmentedLinks, Stat } from "@/components/ui";
import { BucketBarChart, DailyLineChart, ShareDonut } from "@/components/charts";
import { formatDayKey, formatMonthKey, parsePeriod, PERIODS } from "@/lib/dates";
import { countLabel, formatGrams, formatNumber, formatPercent, t } from "@/i18n";

export const metadata: Metadata = { title: "Statistik" };

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string; von?: string; bis?: string }> }) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const period = parsePeriod(sp.zeitraum, "30d");
  const stats = await periodStatistics(user, period, { from: sp.von, to: sp.bis });
  const empty = stats.totals.drinks === 0;
  const c = stats.comparison;

  const weekdayAvg = (() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);
    for (const d of stats.byDay) {
      const wd = (new Date(`${d.day}T12:00:00Z`).getUTCDay() + 6) % 7;
      sums[wd] += d.grams;
      counts[wd] += 1;
    }
    return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label, i) => ({
      key: label,
      label,
      grams: counts[i] ? Math.round((sums[i] / counts[i]) * 10) / 10 : 0,
      highlight: i >= 4,
    }));
  })();

  return (
    <>
      <PageHeader title="Statistik" description={`${formatDayKey(stats.range.fromDay)} – ${formatDayKey(stats.range.toDay)} · Tagesgrenzen in ${user.timezone}`} />
      <div className="mb-6 flex flex-col gap-3">
        <SegmentedLinks
          label="Zeitraum"
          active={period}
          items={PERIODS.filter((p) => p !== "custom").map((p): { value: string; label: string; href: string } => ({ value: p, label: t.periods[p], href: `/statistik?zeitraum=${p}` })).concat([
            { value: "custom", label: t.periods.custom, href: `/statistik?zeitraum=custom&von=${stats.range.fromDay}&bis=${stats.range.toDay}` },
          ])}
        />
        {period === "custom" && (
          <form method="get" className="card flex flex-wrap items-end gap-3 p-3">
            <input type="hidden" name="zeitraum" value="custom" />
            <Field label="Von" htmlFor="von">
              <Input id="von" name="von" type="date" defaultValue={stats.range.fromDay} required />
            </Field>
            <Field label="Bis" htmlFor="bis">
              <Input id="bis" name="bis" type="date" defaultValue={stats.range.toDay} required />
            </Field>
            <Button type="submit">Anwenden</Button>
          </form>
        )}
      </div>

      {empty ? (
        <Card>
          <EmptyState icon={<BarChart3 className="size-6" />} title="Keine Einträge in diesem Zeitraum" action={<LinkButton href="/erfassen">Getränk erfassen</LinkButton>}>
            Wähle einen anderen Zeitraum oder erfasse Getränke – leere Zeiträume werden nicht als Nullwerte dargestellt.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Gesamt" value={formatGrams(stats.totals.grams)} sub={`${countLabel(stats.totals.drinks, "Eintrag", "Einträge")} · ${countLabel(stats.totals.servings, "Portion", "Portionen")}`} />
            <Stat label="Ø pro Tag" value={formatGrams(stats.totals.avgPerDay)} sub={`Ø an Tagen mit Konsum: ${formatGrams(stats.totals.avgPerActiveDay)}`} />
            <Stat label="Tage mit Einträgen" value={`${stats.totals.activeDays} / ${stats.totals.days}`} sub={`${stats.totals.days - stats.totals.activeDays} Tage ohne Einträge`} />
            <Stat
              label="Vergleich Vorzeitraum"
              value={c.change === null ? "–" : formatPercent(c.change)}
              sub={`${formatDayKey(stats.previous.fromDay)}–${formatDayKey(stats.previous.toDay)}: ${formatGrams(c.previous)}`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader title="Konsummenge pro Tag" description="Gramm reinen Alkohols" />
              <DailyLineChart data={stats.byDay} height={260} />
            </Card>
            <Card>
              <CardHeader title="Durchschnitt nach Wochentag" description="Ø Gramm im gewählten Zeitraum · Freitag bis Sonntag hervorgehoben" />
              <BucketBarChart data={weekdayAvg} label="Balkendiagramm: Durchschnitt je Wochentag" />
            </Card>
            <Card>
              <CardHeader title="Verteilung nach Kategorie" description="Anteil an der Gesamtmenge" />
              <ShareDonut data={stats.byCategory.map((x) => ({ name: t.categories[x.category] ?? x.category, value: x.grams }))} label="Kreisdiagramm: Verteilung nach Getränkekategorie" />
            </Card>
            <Card>
              <CardHeader title="Wochenübersicht" description="Letzte 12 Wochen (unabhängig vom Filter)" />
              <BucketBarChart
                data={stats.weekly.map((w, i, arr) => ({ key: w.key, label: `KW ${w.key.slice(-2)}`, grams: w.grams, highlight: i === arr.length - 1 }))}
                label="Balkendiagramm: Gramm pro Kalenderwoche"
              />
            </Card>
            <Card>
              <CardHeader title="Monatsübersicht" description="Letzte 12 Monate (unabhängig vom Filter)" />
              <BucketBarChart
                data={stats.monthly.map((m, i, arr) => ({ key: m.key, label: formatMonthKey(m.key).slice(0, 3), grams: m.grams, highlight: i === arr.length - 1 }))}
                label="Balkendiagramm: Gramm pro Monat"
              />
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Häufigste Getränke" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-fg-muted">
                    <th className="py-2 font-medium">Getränk</th>
                    <th className="py-2 text-right font-medium">Portionen</th>
                    <th className="py-2 text-right font-medium">Alkohol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.topBeverages.map((b) => (
                    <tr key={b.name}>
                      <td className="py-2">{b.name}</td>
                      <td className="py-2 text-right tabular">{b.drinks}</td>
                      <td className="py-2 text-right tabular">{formatNumber(b.grams, 1)} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
