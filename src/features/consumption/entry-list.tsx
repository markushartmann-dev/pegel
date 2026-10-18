"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { ConfirmDialog, Dialog, useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";
import { alcoholGrams } from "@/lib/calculations/alcohol";
import { formatDateTime, formatTime, toLocalDateTimeInput } from "@/lib/dates";
import { formatNumber } from "@/i18n";
import type { EntryDTO } from "@/server/services/entries";
import { BeverageIcon } from "./log-form";

export function EntryList({ entries, timezone, showDate = true }: { entries: EntryDTO[]; timezone: string; showDate?: boolean }) {
  const [editing, setEditing] = useState<EntryDTO | null>(null);
  const [deleting, setDeleting] = useState<EntryDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/v1/entries/${deleting.id}`, { method: "DELETE" });
      toast("Eintrag gelöscht.");
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-fg-muted">
              <BeverageIcon category={e.category} className="size-4" />
            </span>
            <div className="min-w-[9rem] flex-1">
              <p className="truncate text-sm font-medium">
                {e.servings > 1 && <span className="tabular">{e.servings}× </span>}
                {e.beverageName}
              </p>
              <p className="truncate text-xs text-fg-muted tabular">
                {showDate ? formatDateTime(new Date(e.consumedAt), timezone) : `${formatTime(new Date(e.consumedAt), timezone)} Uhr`} · {e.volumeMl} ml ·{" "}
                {formatNumber(e.abv, 1)} %{e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center">
              <span className="mr-1 text-sm font-semibold tabular">{formatNumber(e.alcoholGrams, 1)} g</span>
              <Button variant="ghost" size="icon" onClick={() => setEditing(e)} aria-label={`${e.beverageName} bearbeiten`}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(e)} aria-label={`${e.beverageName} löschen`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {editing && <EditEntryDialog entry={editing} timezone={timezone} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Eintrag löschen?"
        description={deleting ? `${deleting.servings}× ${deleting.beverageName} vom ${formatDateTime(new Date(deleting.consumedAt), timezone)} wird dauerhaft entfernt.` : undefined}
      />
    </>
  );
}

function EditEntryDialog({ entry, timezone, onClose }: { entry: EntryDTO; timezone: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [servings, setServings] = useState(String(entry.servings));
  const [volume, setVolume] = useState(String(entry.volumeMl));
  const [abv, setAbv] = useState(String(entry.abv).replace(".", ","));
  const [time, setTime] = useState(toLocalDateTimeInput(new Date(entry.consumedAt), timezone));
  const [note, setNote] = useState(entry.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  let grams = NaN;
  try {
    grams = alcoholGrams(Number(volume), Number(abv.replace(",", "."))) * Number(servings);
  } catch {
    /* ungültige Eingabe */
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/v1/entries/${entry.id}`, {
        method: "PATCH",
        body: {
          servings: Number(servings),
          volumeMl: Number(volume),
          abv: Number(abv.replace(",", ".")),
          consumedAtLocal: time,
          timezone,
          note: note.trim() || null,
        },
      });
      toast("Eintrag gespeichert.");
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as ApiError).message);
      setFields((err as ApiError).fields ?? {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Eintrag bearbeiten" description={entry.beverageName}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Portionen" htmlFor="e-servings" error={fields.servings}>
            <Input id="e-servings" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
          </Field>
          <Field label="ml/Portion" htmlFor="e-volume" error={fields.volumeMl}>
            <Input id="e-volume" inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} />
          </Field>
          <Field label="% vol" htmlFor="e-abv" error={fields.abv}>
            <Input id="e-abv" inputMode="decimal" value={abv} onChange={(e) => setAbv(e.target.value)} />
          </Field>
        </div>
        <Field label="Zeitpunkt" htmlFor="e-time" error={fields.consumedAtLocal}>
          <Input id="e-time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Notiz" htmlFor="e-note" error={fields.note}>
          <Textarea id="e-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
        <p className="text-sm">
          Reiner Alkohol: <strong className="tabular">{Number.isFinite(grams) ? `${formatNumber(grams, 1)} g` : "–"}</strong>
        </p>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" loading={loading}>
            Speichern
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
