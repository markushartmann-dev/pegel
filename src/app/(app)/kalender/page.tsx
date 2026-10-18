import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PlusCircle } from "lucide-react";
import { requireOnboardedUser } from "@/server/page-auth";
import { monthOverview } from "@/server/services/statistics";
import { entriesForDay } from "@/server/services/entries";
import { dayCurve } from "@/server/services/estimate";
import { Card, CardHeader, LinkButton, PageHeader, SegmentedLinks, cn } from "@/components/ui";
import { EntryList } from "@/features/consumption/entry-list";
import { EstimateChart } from "@/components/charts";
import { addDays, addMonths, dayKey, formatDayKey, formatMonthKey, isValidDayKey, startOfIsoWeek, daysBetween } from "@/lib/dates";
import { countLabel, formatGrams, formatNumber } from "@/i18n";
import { formatPromille } from "@/lib/calculations/widmark";

export const metadata: Metadata = { title: "Kalender" };

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function level(grams: number) {
  if (grams <= 0) return 0;
  if (grams < 20) return 1;
  if (grams < 40) return 2;
  if (grams < 60) return 3;
  return 4;
}
const levelClass = [
  "",
  "bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))]",
  "bg-[color-mix(in_oklab,var(--primary)_28%,var(--card))]",
  "bg-[color-mix(in_oklab,var(--primary)_45%,var(--card))]",
  "bg-[color-mix(in_oklab,var(--primary)_65%,var(--card))]",
];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ monat?: string; tag?: string; ansicht?: string }> }) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const today = dayKey(new Date(), user.timezone);
  const selected = sp.tag && isValidDayKey(sp.tag) ? sp.tag : today;
  const month = sp.monat && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.monat) ? sp.monat : selected.slice(0, 7);
  const view = sp.ansicht === "woche" ? "woche" : "monat";

  const [overview, dayEntries, curve] = await Promise.all([monthOverview(user, month), entriesForDay(user, selected), dayCurve(user, selected)]);
  const href = (m: string, d?: string, v = view) => `/kalender?monat=${m}${d ? `&tag=${d}` : ""}${v === "woche" ? "&ansicht=woche" : ""}`;
  const firstDay = `${month}-01`;
  const leading = (new Date(`${firstDay}T12:00:00Z`).getUTCDay() + 6) % 7;

  // Wochenansicht: Daten der Woche des ausgewählten Tags (ggf. monatsübergreifend)
  const weekStart = startOfIsoWeek(selected);
  const weekDays = daysBetween(weekStart, addDays(weekStart, 6));
  const otherMonth = weekDays.find((d) => d.slice(0, 7) !== month)?.slice(0, 7);
  const otherOverview = view === "woche" && otherMonth ? await monthOverview(user, otherMonth) : null;
  const weekMap = new Map([...overview.days, ...(otherOverview?.days ?? [])].map((d) => [d.day, d]));
  const daySum = dayEntries.reduce((a, e) => a + e.alcoholGrams, 0);

  return (
    <>
      <PageHeader
        title="Kalender"
        description="Tage mit erfassten Getränken sind farbig markiert. Tag antippen für Details."
        actions={
          <SegmentedLinks
            label="Ansicht"
            active={view}
            items={[
              { value: "monat", label: "Monat", href: href(month, selected, "monat") },
              { value: "woche", label: "Woche", href: href(month, selected, "woche") },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <LinkButton href={href(addMonths(firstDay, -12).slice(0, 7))} variant="ghost" size="icon" aria-label="Ein Jahr zurück">
                <ChevronsLeft className="size-4" />
              </LinkButton>
              <LinkButton href={view === "woche" ? href(addDays(selected, -7).slice(0, 7), addDays(selected, -7)) : href(addMonths(firstDay, -1).slice(0, 7))} variant="ghost" size="icon" aria-label={view === "woche" ? "Vorherige Woche" : "Vorheriger Monat"}>
                <ChevronLeft className="size-4" />
              </LinkButton>
            </div>
            <div className="text-center">
              <h2 className="font-semibold capitalize">{view === "woche" ? `${formatDayKey(weekDays[0])} – ${formatDayKey(weekDays[6])}` : formatMonthKey(month)}</h2>
              <Link href={href(today.slice(0, 7), today)} className="text-xs text-primary hover:underline">
                Heute
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <LinkButton href={view === "woche" ? href(addDays(selected, 7).slice(0, 7), addDays(selected, 7)) : href(addMonths(firstDay, 1).slice(0, 7))} variant="ghost" size="icon" aria-label={view === "woche" ? "Nächste Woche" : "Nächster Monat"}>
                <ChevronRight className="size-4" />
              </LinkButton>
              <LinkButton href={href(addMonths(firstDay, 12).slice(0, 7))} variant="ghost" size="icon" aria-label="Ein Jahr vor">
                <ChevronsRight className="size-4" />
              </LinkButton>
            </div>
          </div>

          {view === "monat" ? (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-fg-muted" aria-hidden>
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <ol className="grid grid-cols-7 gap-1" aria-label={`Tage im ${formatMonthKey(month)}`}>
                {Array.from({ length: leading }).map((_, i) => (
                  <li key={`pad-${i}`} aria-hidden />
                ))}
                {overview.days.map((d) => {
                  const lv = level(d.grams);
                  const isSel = d.day === selected;
                  const isToday = d.day === today;
                  return (
                    <li key={d.day}>
                      <Link
                        href={href(month, d.day)}
                        aria-current={isSel ? "date" : undefined}
                        aria-label={`${formatDayKey(d.day, "long")}: ${d.drinks ? `${d.drinks} Einträge, ${formatGrams(d.grams)}` : "keine Einträge"}`}
                        className={cn(
                          "flex aspect-square min-h-11 flex-col items-center justify-center rounded-[var(--radius-sm)] border text-sm transition-colors sm:aspect-[4/3]",
                          levelClass[lv],
                          isSel ? "border-primary ring-2 ring-primary/40" : "border-transparent hover:border-border",
                          d.day > today && "text-fg-muted/60",
                        )}
                      >
                        <span className={cn("tabular", isToday && "font-bold text-primary")}>{Number(d.day.slice(8))}</span>
                        {d.drinks > 0 && <span className="hidden text-[10px] leading-none text-fg-muted tabular sm:block">{formatNumber(d.grams, 0)} g</span>}
                        {d.drinks > 0 && <span className="mt-0.5 size-1.5 rounded-full bg-primary sm:hidden" aria-hidden />}
                      </Link>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
                <span>
                  Monat: <strong className="text-fg tabular">{formatGrams(overview.totals.grams)}</strong> · {countLabel(overview.totals.activeDays, "Tag", "Tage")} mit Einträgen
                </span>
                <span className="flex items-center gap-1" aria-hidden>
                  weniger
                  {levelClass.slice(1).map((c, i) => (
                    <span key={i} className={cn("size-3 rounded-sm border border-border", c)} />
                  ))}
                  mehr
                </span>
              </div>
            </>
          ) : (
            <ul className="divide-y divide-border">
              {weekDays.map((d) => {
                const s = weekMap.get(d);
                return (
                  <li key={d}>
                    <Link href={href(d.slice(0, 7), d, "woche")} aria-current={d === selected ? "date" : undefined} className={cn("flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-muted", d === selected && "bg-muted")}>
                      <span className={cn("text-sm", d === today && "font-semibold text-primary")}>{formatDayKey(d, "long")}</span>
                      <span className="text-sm tabular text-fg-muted">{s && s.drinks ? `${s.drinks} × · ${formatGrams(s.grams)}` : "–"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader
              title={formatDayKey(selected, "long")}
              description={dayEntries.length ? `${countLabel(dayEntries.length, "Eintrag", "Einträge")} · ${formatGrams(daySum)}` : "Keine Einträge"}
              action={
                selected <= today ? (
                  <LinkButton href={`/erfassen?tag=${selected}`} size="sm" variant="outline">
                    <PlusCircle className="size-4" aria-hidden /> Nachtragen
                  </LinkButton>
                ) : undefined
              }
            />
            {dayEntries.length ? <EntryList entries={dayEntries} timezone={user.timezone} showDate={false} /> : <p className="text-sm text-fg-muted">An diesem Tag wurde nichts erfasst.</p>}
          </Card>
          {curve.status === "ok" && (
            <Card>
              <CardHeader title="Modellverlauf an diesem Tag" description={`Höchster Modellwert ca. ${formatPromille(curve.peak)} · mit dem damals gültigen Profil`} />
              <EstimateChart curve={curve.curve} timezone={user.timezone} height={170} />
              <p className="mt-2 text-xs text-fg-muted">Rechnerische Schätzung, keine Messung.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
