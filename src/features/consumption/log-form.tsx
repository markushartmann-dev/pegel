"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Beer, GlassWater, Minus, Plus, Wine, Citrus, Martini, Settings2, CupSoda } from "lucide-react";
import { Alert, Button, Field, Input, Textarea, cn } from "@/components/ui";
import { useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";
import { alcoholGrams } from "@/lib/calculations/alcohol";
import { toLocalDateTimeInput } from "@/lib/dates";
import { formatNumber, t } from "@/i18n";
import type { BeverageDTO } from "@/server/services/beverages";

export function BeverageIcon({ category, className }: { category: string; className?: string }) {
  const Icon = category === "BEER" ? Beer : category === "WINE" || category === "SPARKLING" ? Wine : category === "SPIRITS" ? GlassWater : category === "MIXED" ? Citrus : category === "CIDER" ? Martini : CupSoda;
  return <Icon className={className} aria-hidden />;
}

function newRequestId() {
  return crypto.randomUUID();
}

export function LogForm({
  beverages,
  timezone,
  defaultDay,
  onDone,
  compact,
}: {
  beverages: BeverageDTO[];
  timezone: string;
  /** Vorbelegung für einen vergangenen Tag ("YYYY-MM-DD"), sonst jetzt */
  defaultDay?: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const initialTime = defaultDay ? `${defaultDay}T20:00` : toLocalDateTimeInput(new Date(), timezone);
  const [selected, setSelected] = useState<string | null>(null);
  const [servings, setServings] = useState(1);
  const [time, setTime] = useState(initialTime);
  const [custom, setCustom] = useState(false);
  const [volume, setVolume] = useState("");
  const [abv, setAbv] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(newRequestId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const defaults = beverages.filter((b) => b.isDefault);
  const own = beverages.filter((b) => b.own);
  const bev = beverages.find((b) => b.id === selected) ?? null;

  const effVolume = custom && volume ? Number(volume) : bev?.volumeMl ?? 0;
  const effAbv = custom && abv ? Number(abv.replace(",", ".")) : bev?.abv ?? 0;
  const grams = useMemo(() => {
    try {
      return alcoholGrams(effVolume, effAbv) * servings;
    } catch {
      return NaN;
    }
  }, [effVolume, effAbv, servings]);

  function select(b: BeverageDTO) {
    setSelected(b.id);
    setVolume(String(b.volumeMl));
    setAbv(String(b.abv).replace(".", ","));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!bev || loading) return;
    setLoading(true);
    setError(null);
    setFields({});
    try {
      const body: Record<string, unknown> = {
        beverageId: bev.id,
        servings,
        consumedAtLocal: time,
        timezone,
        note: note.trim() || null,
        clientRequestId: requestId,
      };
      if (custom) {
        if (Number(volume) !== bev.volumeMl) body.volumeMl = Number(volume);
        if (Number(abv.replace(",", ".")) !== bev.abv) body.abv = Number(abv.replace(",", "."));
      }
      await api("/api/v1/entries", { method: "POST", body });
      toast(`${servings} × ${bev.name} erfasst (${formatNumber(grams, 1)} g Alkohol).`);
      setRequestId(newRequestId());
      setSelected(null);
      setServings(1);
      setCustom(false);
      setNote("");
      setTime(defaultDay ? `${defaultDay}T20:00` : toLocalDateTimeInput(new Date(), timezone));
      router.refresh();
      onDone?.();
    } catch (err) {
      const e2 = err as ApiError;
      setError(e2.message);
      setFields(e2.fields ?? {});
    } finally {
      setLoading(false);
    }
  }

  const tile = (b: BeverageDTO) => (
    <li key={b.id}>
      <button
        type="button"
        onClick={() => select(b)}
        aria-pressed={selected === b.id}
        className={cn(
          "flex h-full w-full flex-col items-start gap-1 rounded-[var(--radius-sm)] border p-3 text-left transition-colors",
          selected === b.id ? "border-primary bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))]" : "border-border bg-card hover:bg-muted",
        )}
      >
        <BeverageIcon category={b.category} className={cn("size-5", selected === b.id ? "text-primary" : "text-fg-muted")} />
        <span className="text-sm font-medium leading-tight">{b.name}</span>
        <span className="text-xs text-fg-muted tabular">
          {b.volumeMl} ml · {formatNumber(b.abv, 1)} %
        </span>
        <span className="text-xs font-medium text-fg tabular">{formatNumber(b.alcoholGrams, 1)} g Alkohol</span>
      </button>
    </li>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-label="Getränk erfassen">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Standardgetränke</legend>
        <ul className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>{defaults.map(tile)}</ul>
      </fieldset>
      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
          <span>Meine Getränke</span>
          <Link href="/getraenke" className="text-xs font-normal text-primary hover:underline">
            Verwalten
          </Link>
        </legend>
        {own.length ? (
          <ul className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>{own.map(tile)}</ul>
        ) : (
          <p className="text-sm text-fg-muted">
            Noch keine eigenen Getränke.{" "}
            <Link href="/getraenke" className="text-primary hover:underline">
              Jetzt anlegen
            </Link>{" "}
            – z. B. mit dem genauen Alkoholgehalt vom Etikett.
          </p>
        )}
      </fieldset>

      {bev && (
        <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">{bev.name}</p>
            <div className="flex items-center gap-2" role="group" aria-label={t.common.servings}>
              <Button variant="outline" size="icon" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Eine Portion weniger" disabled={servings <= 1}>
                <Minus className="size-4" />
              </Button>
              <output className="w-16 text-center text-lg font-semibold tabular" aria-live="polite">
                {servings}×
              </output>
              <Button variant="outline" size="icon" onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="Eine Portion mehr" disabled={servings >= 20}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Zeitpunkt" htmlFor="consumedAt" error={fields.consumedAtLocal} hint={`Zeitzone: ${timezone}`}>
              <Input id="consumedAt" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required />
            </Field>
            <Field label={<>Notiz <span className="font-normal text-fg-muted">({t.common.optional})</span></>} htmlFor="note" error={fields.note}>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={1} className="min-h-10" />
            </Field>
          </div>
          <div>
            <button type="button" onClick={() => setCustom((c) => !c)} className="flex items-center gap-1.5 text-sm text-primary hover:underline" aria-expanded={custom}>
              <Settings2 className="size-4" aria-hidden /> Menge oder Alkoholgehalt nur für diesen Eintrag anpassen
            </button>
            {custom && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Volumen je Portion (ml)" htmlFor="volume" error={fields.volumeMl}>
                  <Input id="volume" inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} />
                </Field>
                <Field label="Alkoholgehalt (% vol)" htmlFor="abv" error={fields.abv}>
                  <Input id="abv" inputMode="decimal" value={abv} onChange={(e) => setAbv(e.target.value)} />
                </Field>
                <p className="text-xs text-fg-muted sm:col-span-2">Das gespeicherte Getränk bleibt unverändert.</p>
              </div>
            )}
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm">
              Reiner Alkohol:{" "}
              <strong className="text-lg tabular">{Number.isFinite(grams) ? `${formatNumber(grams, 1)} g` : "–"}</strong>
            </p>
            <Button type="submit" size="lg" loading={loading} disabled={!Number.isFinite(grams)}>
              Erfassen
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
