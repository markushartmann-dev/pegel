"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";
import { DURATION_LIMITS, DURATION_PRESETS, INTENSITIES, INTENSITY_LABELS, formatDuration, type Intensity } from "@/lib/activities";
import { parseLocalDateTime, timeZoneOptions, toLocalDateTimeInput } from "@/lib/dates";
import { t } from "@/i18n";
import type { ActivityTypeDTO } from "@/server/services/activities";
import { ActivityIcon } from "./activity-icon";

const chip = (active: boolean) =>
  cn(
    "min-h-10 whitespace-nowrap rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-medium tabular transition-colors",
    active ? "border-primary bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] text-primary" : "border-border bg-card hover:bg-muted",
  );

export function IntensityPicker({ value, onChange, idPrefix }: { value: Intensity; onChange: (v: Intensity) => void; idPrefix: string }) {
  return (
    <div role="radiogroup" aria-labelledby={`${idPrefix}-label`} className="grid grid-cols-3 gap-2">
      {INTENSITIES.map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(i)} className={chip(value === i)}>
          {INTENSITY_LABELS[i]}
        </button>
      ))}
    </div>
  );
}

export function ActivityForm({ types, timezone, defaultDay }: { types: ActivityTypeDTO[]; timezone: string; defaultDay?: string }) {
  const router = useRouter();
  const toast = useToast();
  const initialTime = () => (defaultDay ? `${defaultDay}T18:00` : toLocalDateTimeInput(new Date(Date.now() - 60 * 60_000), timezone));
  const [selected, setSelected] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(60);
  const [customDuration, setCustomDuration] = useState(false);
  const [durationText, setDurationText] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("MODERATE");
  const [time, setTime] = useState(initialTime);
  const [entryTz, setEntryTz] = useState(timezone);
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const defaults = types.filter((a) => a.isDefault);
  const own = types.filter((a) => a.own);
  const type = types.find((a) => a.id === selected) ?? null;
  const effDuration = customDuration ? Number(durationText) : duration;
  const durationValid = !!effDuration && Number.isInteger(effDuration) && effDuration >= DURATION_LIMITS.min && effDuration <= DURATION_LIMITS.max;

  function select(a: ActivityTypeDTO) {
    setSelected(a.id);
    setIntensity(a.defaultIntensity);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || loading) return;
    setLoading(true);
    setError(null);
    setFields({});
    try {
      await api("/api/v1/activities", {
        method: "POST",
        body: {
          activityTypeId: type.id,
          durationMin: effDuration,
          intensity,
          performedAtLocal: time,
          timezone: entryTz,
          note: note.trim() || null,
          clientRequestId: requestId,
        },
      });
      toast(`${type.name} erfasst (${formatDuration(effDuration ?? 0)}, ${INTENSITY_LABELS[intensity]}).`);
      setRequestId(crypto.randomUUID());
      setSelected(null);
      setDuration(60);
      setCustomDuration(false);
      setDurationText("");
      setNote("");
      setTime(initialTime());
      setEntryTz(timezone);
      router.refresh();
    } catch (err) {
      setError((err as ApiError).message);
      setFields((err as ApiError).fields ?? {});
    } finally {
      setLoading(false);
    }
  }

  const tile = (a: ActivityTypeDTO) => (
    <li key={a.id}>
      <button
        type="button"
        onClick={() => select(a)}
        aria-pressed={selected === a.id}
        className={cn(
          "flex h-full w-full flex-col items-start gap-1 rounded-[var(--radius-sm)] border p-3 text-left transition-colors",
          selected === a.id ? "border-primary bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))]" : "border-border bg-card hover:bg-muted",
        )}
      >
        <ActivityIcon icon={a.icon} className={cn("size-5", selected === a.id ? "text-primary" : "text-fg-muted")} />
        <span className="text-sm font-medium leading-tight break-words">{a.name}</span>
        <span className="text-xs text-fg-muted">meist {INTENSITY_LABELS[a.defaultIntensity]}</span>
      </button>
    </li>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-label="Sport erfassen">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Standard-Sportarten</legend>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{defaults.map(tile)}</ul>
      </fieldset>
      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
          <span>Meine Sportarten</span>
          <Link href="/sportarten" className="text-xs font-normal text-primary hover:underline">
            Verwalten
          </Link>
        </legend>
        {own.length ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{own.map(tile)}</ul>
        ) : (
          <p className="text-sm text-fg-muted">
            Noch keine eigenen Sportarten.{" "}
            <Link href="/sportarten" className="text-primary hover:underline">
              Jetzt anlegen
            </Link>{" "}
            – z. B. Klettern oder Tanzen.
          </p>
        )}
      </fieldset>

      {type && (
        <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-muted/40 p-4">
          <p className="font-medium break-words">{type.name}</p>
          <div>
            <p id="duration-label" className="mb-2 text-sm font-medium">
              Dauer
            </p>
            <div role="radiogroup" aria-labelledby="duration-label" className="flex flex-wrap gap-2 [&>button]:min-w-[5.5rem] [&>button]:flex-1">
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={!customDuration && duration === m}
                  onClick={() => {
                    setCustomDuration(false);
                    setDuration(m);
                  }}
                  className={chip(!customDuration && duration === m)}
                >
                  {m} Min.
                </button>
              ))}
              <button type="button" role="radio" aria-checked={customDuration} onClick={() => setCustomDuration(true)} className={chip(customDuration)}>
                Andere …
              </button>
            </div>
            {customDuration && (
              <Field className="mt-3 max-w-48" label="Minuten" htmlFor="duration" error={fields.durationMin} hint="1–600 Minuten">
                <Input id="duration" inputMode="numeric" value={durationText} onChange={(e) => setDurationText(e.target.value.replace(/\D/g, ""))} autoFocus />
              </Field>
            )}
            {!customDuration && fields.durationMin && <p className="mt-1 text-xs text-danger">{fields.durationMin}</p>}
          </div>
          <div>
            <p id="intensity-label" className="mb-2 text-sm font-medium">
              Intensität
            </p>
            <IntensityPicker value={intensity} onChange={setIntensity} idPrefix="intensity" />
            <p className="mt-1 text-xs text-fg-muted">Mittel: Puls erhöht, Unterhaltung noch möglich. Intensiv: nur noch wenige Worte am Stück.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Beginn (Ortszeit)" htmlFor="performedAt" error={fields.performedAtLocal}>
              <Input id="performedAt" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required />
            </Field>
            <Field label="Zeitzone" htmlFor="activityTz">
              <Select
                id="activityTz"
                value={entryTz}
                onChange={(e) => {
                  const parsed = parseLocalDateTime(time, entryTz);
                  if (parsed) setTime(toLocalDateTimeInput(parsed, e.target.value));
                  setEntryTz(e.target.value);
                }}
              >
                {timeZoneOptions(entryTz).map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </Select>
            </Field>
            <Field className="sm:col-span-2" label={<>Notiz <span className="font-normal text-fg-muted">({t.common.optional})</span></>} htmlFor="activityNote" error={fields.note}>
              <Textarea id="activityNote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={1} className="min-h-10" />
            </Field>
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm">
              <strong className="text-lg tabular">{durationValid ? formatDuration(effDuration ?? 0) : "–"}</strong> · {INTENSITY_LABELS[intensity]}
            </p>
            <Button type="submit" size="lg" loading={loading} disabled={!durationValid}>
              Erfassen
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
