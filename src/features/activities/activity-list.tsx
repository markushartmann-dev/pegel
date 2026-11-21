"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ConfirmDialog, Dialog, useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";
import { INTENSITY_LABELS, formatDuration, type Intensity } from "@/lib/activities";
import { formatDateTime, formatTime, parseLocalDateTime, timeZoneCity, timeZoneOptions, toLocalDateTimeInput } from "@/lib/dates";
import type { ActivityEntryDTO } from "@/server/services/activities";
import { ActivityIcon } from "./activity-icon";
import { IntensityPicker } from "./activity-form";

export function ActivityList({ entries, timezone, showDate = true }: { entries: ActivityEntryDTO[]; timezone: string; showDate?: boolean }) {
  const [editing, setEditing] = useState<ActivityEntryDTO | null>(null);
  const [deleting, setDeleting] = useState<ActivityEntryDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/v1/activities/${deleting.id}`, { method: "DELETE" });
      toast("Einheit gelöscht.");
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
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_16%,var(--card))] text-success">
              <ActivityIcon icon={e.icon} className="size-4" />
            </span>
            <div className="min-w-[9rem] flex-1">
              <p className="text-sm font-medium break-words">{e.activityName}</p>
              <p className="text-xs text-fg-muted tabular break-words">
                {showDate ? formatDateTime(new Date(e.performedAt), e.timezone) : `${formatTime(new Date(e.performedAt), e.timezone)} Uhr`}
                {e.timezone !== timezone && ` (${timeZoneCity(e.timezone)})`} · {INTENSITY_LABELS[e.intensity]}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center">
              <span className="mr-1 text-sm font-semibold tabular">{formatDuration(e.durationMin)}</span>
              <Button variant="ghost" size="icon" onClick={() => setEditing(e)} aria-label={`${e.activityName} bearbeiten`}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(e)} aria-label={`${e.activityName} löschen`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {editing && <EditActivityDialog entry={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Einheit löschen?"
        description={deleting ? `${deleting.activityName} (${formatDuration(deleting.durationMin)}) vom ${formatDateTime(new Date(deleting.performedAt), deleting.timezone)} wird dauerhaft entfernt.` : undefined}
      />
    </>
  );
}

function EditActivityDialog({ entry, onClose }: { entry: ActivityEntryDTO; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [duration, setDuration] = useState(String(entry.durationMin));
  const [intensity, setIntensity] = useState<Intensity>(entry.intensity);
  const [timezone, setTimezone] = useState(entry.timezone);
  const [time, setTime] = useState(toLocalDateTimeInput(new Date(entry.performedAt), entry.timezone));
  const [note, setNote] = useState(entry.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api(`/api/v1/activities/${entry.id}`, {
        method: "PATCH",
        body: { durationMin: Number(duration), intensity, performedAtLocal: time, timezone, note: note.trim() || null },
      });
      toast("Einheit gespeichert.");
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
    <Dialog open onClose={onClose} title="Einheit bearbeiten" description={entry.activityName}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Dauer (Minuten)" htmlFor="ae-duration" error={fields.durationMin}>
          <Input id="ae-duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <div>
          <p id="ae-intensity-label" className="mb-2 text-sm font-medium">
            Intensität
          </p>
          <IntensityPicker value={intensity} onChange={setIntensity} idPrefix="ae-intensity" />
        </div>
        <Field label="Beginn (Ortszeit)" htmlFor="ae-time" error={fields.performedAtLocal}>
          <Input id="ae-time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Zeitzone" htmlFor="ae-tz">
          <Select
            id="ae-tz"
            value={timezone}
            onChange={(e) => {
              const parsed = parseLocalDateTime(time, timezone);
              if (parsed) setTime(toLocalDateTimeInput(parsed, e.target.value));
              setTimezone(e.target.value);
            }}
          >
            {timeZoneOptions(timezone).map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notiz" htmlFor="ae-note" error={fields.note}>
          <Textarea id="ae-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
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
