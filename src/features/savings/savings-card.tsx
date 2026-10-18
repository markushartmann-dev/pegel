import { Flame, PiggyBank } from "lucide-react";
import { Card, CardHeader, cn } from "@/components/ui";
import { formatDayKey } from "@/lib/dates";
import { countLabel, formatEuro } from "@/i18n";
import type { UserSavings } from "@/server/services/savings";

/** Sparschwein: Belohnung für Tage ohne erfasste Getränke. */
export function SavingsCard({ savings, className }: { savings: UserSavings; className?: string }) {
  const { rules } = savings;
  const progress = 7 - savings.daysToWeekBonus;
  return (
    <Card className={className}>
      <CardHeader
        icon={<PiggyBank className="size-5" />}
        title="Sparschwein"
        description={`${formatEuro(rules.perDay)} je Tag ohne Alkohol · +${formatEuro(rules.weekBonus)} je volle Woche am Stück · +${formatEuro(rules.monthBonus)} je ganzer Monat`}
      />
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Gespart seit {formatDayKey(savings.startDay)}</p>
          <p className="text-4xl font-semibold tracking-tight tabular">{formatEuro(savings.total)}</p>
          <p className="text-xs text-fg-muted tabular">
            7 Tage: {formatEuro(savings.last7)} · 30 Tage: {formatEuro(savings.last30)}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-fg-muted">
            <Flame className={cn("size-3", savings.currentStreak > 0 && "text-warning")} aria-hidden /> Serie
          </p>
          <p className="text-xl font-semibold tabular">{countLabel(savings.currentStreak, "Tag", "Tage")}</p>
          <p className="text-xs text-fg-muted tabular">Rekord: {countLabel(savings.longestStreak, "Tag", "Tage")}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-fg-muted">
          <span>Bis zum Wochenbonus</span>
          <span className="tabular">
            {progress} / 7 · noch {countLabel(savings.daysToWeekBonus, "Tag", "Tage")}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={7} aria-valuenow={progress} aria-label="Fortschritt bis zum Wochenbonus">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(progress / 7) * 100}%` }} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-[var(--radius-sm)] bg-muted p-2">
          <dt className="text-fg-muted">Tage ohne</dt>
          <dd className="text-base font-semibold tabular">{savings.dryDays}</dd>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-muted p-2">
          <dt className="text-fg-muted">Wochenboni</dt>
          <dd className="text-base font-semibold tabular">{savings.weekBonuses}</dd>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-muted p-2">
          <dt className="text-fg-muted">Monatsboni</dt>
          <dd className="text-base font-semibold tabular">{savings.monthBonuses}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-fg-muted">
        {savings.todayDry
          ? `Heute bisher nichts erfasst – um Mitternacht kommen ${formatEuro(rules.perDay)} dazu.`
          : "Heute wurde Alkohol erfasst – die Serie beginnt morgen neu."}{" "}
        Gezählt werden Tage ohne erfasste Getränke.
      </p>
    </Card>
  );
}
