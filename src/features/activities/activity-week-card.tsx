import { HeartPulse, PlusCircle } from "lucide-react";
import { Card, CardHeader, LinkButton, cn } from "@/components/ui";
import { WHO_WEEKLY_MINUTES, formatDuration, type ActivitySummary } from "@/lib/activities";
import { countLabel } from "@/i18n";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Week = ActivitySummary & { days: { day: string; minutes: number }[]; toDay: string; hasAny: boolean };

/**
 * Bewegung der aktuellen Kalenderwoche mit Fortschritt zum WHO-Richtwert.
 * Bewusst ohne Bezug zum Alkohol: Sport gleicht nichts aus und ändert die Schätzung nicht.
 */
export function ActivityWeekCard({ week, className }: { week: Week; className?: string }) {
  const share = Math.min(1, week.whoShare);
  const reached = week.whoMinutes >= WHO_WEEKLY_MINUTES;
  const max = Math.max(60, ...week.days.map((d) => d.minutes));
  return (
    <Card className={className}>
      <CardHeader
        icon={<HeartPulse className="size-5" />}
        title="Bewegung diese Woche"
        description="WHO-Richtwert: 150 Min. mittel oder 75 Min. intensiv pro Woche"
        action={
          <LinkButton href="/erfassen?art=sport" size="sm" variant="outline">
            <PlusCircle className="size-4" aria-hidden /> Sport
          </LinkButton>
        }
      />
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-4xl font-semibold tracking-tight tabular">{formatDuration(week.minutes)}</p>
          <p className="text-xs text-fg-muted tabular">
            {countLabel(week.sessions, "Einheit", "Einheiten")} an {countLabel(week.activeDays, "Tag", "Tagen")}
          </p>
        </div>
        <ol className="flex h-14 flex-1 items-end gap-1.5" aria-label="Minuten pro Wochentag">
          {week.days.map((d, i) => (
            <li key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${WEEKDAYS[i]}: ${formatDuration(d.minutes)}`}>
              <span
                className={cn("w-full rounded-sm", d.minutes > 0 ? "bg-success" : "bg-muted", d.day > week.toDay && "opacity-40")}
                style={{ height: `${Math.max(4, (d.minutes / max) * 40)}px` }}
                aria-hidden
              />
              <span className="text-[10px] text-fg-muted">
                {WEEKDAYS[i]}
                <span className="sr-only">: {formatDuration(d.minutes)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between gap-2 text-xs text-fg-muted">
          <span>Zum Richtwert</span>
          <span className="tabular">
            {week.whoMinutes} / {WHO_WEEKLY_MINUTES} Min.{reached ? " · erreicht" : ""}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={WHO_WEEKLY_MINUTES} aria-valuenow={Math.min(week.whoMinutes, WHO_WEEKLY_MINUTES)} aria-label="Fortschritt zum WHO-Richtwert">
          <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${share * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          Intensive Minuten zählen doppelt, leichte nicht. {week.byIntensity.LIGHT > 0 && `Dazu ${formatDuration(week.byIntensity.LIGHT)} leichte Bewegung.`}
        </p>
      </div>
    </Card>
  );
}
