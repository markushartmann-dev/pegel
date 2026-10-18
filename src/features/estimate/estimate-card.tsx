import Link from "next/link";
import { Activity, AlertTriangle, Clock } from "lucide-react";
import { Alert, Badge, Card, CardHeader, LinkButton } from "@/components/ui";
import { EstimateChart } from "@/components/charts";
import { formatDuration, formatPromille } from "@/lib/calculations/widmark";
import { formatDateTime, formatTime } from "@/lib/dates";
import { t } from "@/i18n";
import type { EstimateDTO } from "@/server/services/estimate";
import { RefreshButton } from "./refresh-button";

/**
 * Anzeige der Modellschätzung. Bewusst ohne Aussage zur Fahrtüchtigkeit;
 * der Hinweis ist auf jeder Karte sichtbar.
 */
export function EstimateCard({ estimate, timezone }: { estimate: EstimateDTO; timezone: string }) {
  return (
    <Card aria-labelledby="estimate-title">
      <CardHeader
        icon={<Activity className="size-5" />}
        title={<span id="estimate-title">{t.estimate.title}</span>}
        description="Vereinfachtes Widmark-Modell · Werte gerundet"
        action={<RefreshButton />}
      />
      {estimate.status === "unavailable" && (
        <Alert tone="info" title={t.estimate.noProfile}>
          {estimate.reason}{" "}
          <Link href="/einstellungen" className="underline">
            Profil ergänzen
          </Link>
        </Alert>
      )}
      {estimate.status === "no_data" && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-fg-muted">{t.estimate.noData} Es wird daher keine Prognose angezeigt.</p>
          <LinkButton href="/erfassen" size="sm" variant="outline">
            Getränk erfassen
          </LinkButton>
        </div>
      )}
      {estimate.status === "zero" && (
        <div className="flex flex-col gap-2">
          <p className="text-3xl font-semibold tabular">0,0 ‰</p>
          <p className="text-sm text-fg-muted">
            {t.estimate.zero} Letztes erfasstes Getränk: {formatDateTime(new Date(estimate.lastDrinkAt), timezone)}.
          </p>
          <p className="text-xs text-fg-muted">{t.estimate.zeroHint}</p>
        </div>
      )}
      {estimate.status === "ok" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-muted">Jetzt ca.</p>
              <p className="text-4xl font-semibold tracking-tight tabular">{formatPromille(estimate.current)}</p>
              <p className="text-xs text-fg-muted tabular">
                {t.estimate.range}: {formatPromille(estimate.currentRange.low)} – {formatPromille(estimate.currentRange.high)}
              </p>
            </div>
            {estimate.zeroAt && (
              <div>
                <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-fg-muted">
                  <Clock className="size-3" aria-hidden /> {t.estimate.zeroAt}
                </p>
                <p className="text-xl font-semibold tabular">{formatTime(new Date(estimate.zeroAt), timezone)} Uhr</p>
                <p className="text-xs text-fg-muted tabular">
                  {t.estimate.remaining} {formatDuration(estimate.hoursToZero)}
                  {estimate.zeroAtRange.earliest && estimate.zeroAtRange.latest && (
                    <>
                      {" "}
                      (Spanne {formatTime(new Date(estimate.zeroAtRange.earliest), timezone)}–{formatTime(new Date(estimate.zeroAtRange.latest), timezone)})
                    </>
                  )}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-muted">{t.estimate.peak}</p>
              <p className="text-xl font-semibold tabular">{formatPromille(estimate.peak)}</p>
              <p className="text-xs text-fg-muted tabular">um {formatTime(new Date(estimate.peakAt), timezone)} Uhr</p>
            </div>
          </div>
          {estimate.flags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {estimate.flags.map((f) => (
                <li key={f}>
                  <Badge tone={f === "HIGH_VALUE" ? "danger" : "warning"}>
                    <AlertTriangle className="size-3" aria-hidden />
                    {t.estimate.flags[f] ?? f}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <EstimateChart curve={estimate.curve} now={estimate.now} timezone={timezone} />
          <p className="text-xs text-fg-muted">
            Annahmen: r = {estimate.factor.toLocaleString("de-DE", { maximumFractionDigits: 3 })}, β ={" "}
            {estimate.params.betaPerHour.toLocaleString("de-DE")} ‰/h, Resorption {estimate.params.absorptionMinutes} Min. ·{" "}
            {estimate.drinksConsidered} Getränk(e) der letzten 72 h berücksichtigt.
          </p>
        </div>
      )}
      <Alert tone="warning" className="mt-4">
        {t.estimate.disclaimerShort}{" "}
        <Link href="/hinweise" className="underline">
          Details zum Modell
        </Link>
      </Alert>
    </Card>
  );
}
