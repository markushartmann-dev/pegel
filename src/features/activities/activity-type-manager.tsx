"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Megaphone, Pencil, Plus, Star, Undo2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, cn } from "@/components/ui";
import { ConfirmDialog, Dialog, useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";
import { ACTIVITY_ICONS, INTENSITIES, INTENSITY_LABELS, type Intensity } from "@/lib/activities";
import type { ActivityTypeDTO } from "@/server/services/activities";
import { ACTIVITY_ICON_LABELS, ActivityIcon } from "./activity-icon";

type FormState = { id?: string; name: string; description: string; icon: string; defaultIntensity: Intensity; isFavorite: boolean };
const empty: FormState = { name: "", description: "", icon: "other", defaultIntensity: "MODERATE", isFavorite: true };

export function ActivityTypeManager({ types, isAdmin }: { types: ActivityTypeDTO[]; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [archiving, setArchiving] = useState<ActivityTypeDTO | null>(null);
  const [suggesting, setSuggesting] = useState<ActivityTypeDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const own = types.filter((a) => a.own);
  const active = own.filter((a) => a.isActive);
  const archived = own.filter((a) => !a.isActive);
  const defaults = types.filter((a) => a.isDefault);

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await fn();
      toast(message);
      setArchiving(null);
      setSuggesting(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const edit = (a: ActivityTypeDTO) =>
    setForm({ id: a.id, name: a.name, description: a.description ?? "", icon: a.icon ?? "other", defaultIntensity: a.defaultIntensity, isFavorite: a.isFavorite });

  const row = (a: ActivityTypeDTO, actions: React.ReactNode) => (
    <li key={a.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 py-3", !a.isActive && "opacity-60")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-fg-muted">
        <ActivityIcon icon={a.icon} className="size-4" />
      </span>
      <div className="min-w-[9rem] flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium break-words">
          <span className="break-words">{a.name}</span>
          {a.isFavorite && a.own && <Star className="size-3.5 fill-current text-warning" aria-label="Favorit" />}
          {!a.isActive && <Badge>Archiviert</Badge>}
          {a.own && a.isActive && a.suggestionStatus === "PENDING" && <Badge tone="primary">Vorschlag offen</Badge>}
          {a.own && a.isActive && a.suggestionStatus === "REJECTED" && <Badge tone="warning">Vorschlag abgelehnt</Badge>}
        </p>
        <p className="text-xs text-fg-muted break-words">
          Standard: {INTENSITY_LABELS[a.defaultIntensity]}
          {a.description ? ` · ${a.description}` : ""}
        </p>
        {a.own && a.isActive && a.suggestionStatus === "REJECTED" && a.suggestionNote && (
          <p className="mt-1 text-xs text-warning break-words">Begründung: {a.suggestionNote}</p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Meine Sportarten"
          description="Nur für dich sichtbar. Favoriten erscheinen beim Erfassen zuerst. Mit dem Megafon schlägst du eine Sportart für alle vor."
          action={
            <Button size="sm" onClick={() => setForm(empty)}>
              <Plus className="size-4" aria-hidden /> Neu
            </Button>
          }
        />
        {active.length ? (
          <ul className="divide-y divide-border">
            {active.map((a) =>
              row(
                a,
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => run(() => api(`/api/v1/activity-types/${a.id}`, { method: "PATCH", body: { isFavorite: !a.isFavorite } }), a.isFavorite ? "Favorit entfernt." : "Als Favorit markiert.")}
                    aria-label={a.isFavorite ? `${a.name} als Favorit entfernen` : `${a.name} als Favorit markieren`}
                    aria-pressed={a.isFavorite}
                  >
                    <Star className={cn("size-4", a.isFavorite && "fill-current text-warning")} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => edit(a)} aria-label={`${a.name} bearbeiten`}>
                    <Pencil className="size-4" />
                  </Button>
                  {a.suggestionStatus === "PENDING" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      onClick={() => run(() => api(`/api/v1/activity-types/${a.id}/suggestion`, { method: "DELETE" }), "Vorschlag zurückgezogen.")}
                      aria-label={`Vorschlag für ${a.name} zurückziehen`}
                      title="Vorschlag zurückziehen"
                    >
                      <Undo2 className="size-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setSuggesting(a)} aria-label={`${a.name} für alle vorschlagen`} title="Für alle vorschlagen">
                      <Megaphone className="size-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setArchiving(a)} aria-label={`${a.name} archivieren`}>
                    <Archive className="size-4" />
                  </Button>
                </>,
              ),
            )}
          </ul>
        ) : (
          <EmptyState title="Noch keine eigenen Sportarten" action={<Button onClick={() => setForm(empty)}>Sportart anlegen</Button>}>
            Lege z. B. Klettern, Rudern oder Tanzen an.
          </EmptyState>
        )}
        {archived.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-fg-muted">Archiviert ({archived.length})</summary>
            <ul className="divide-y divide-border">
              {archived.map((a) =>
                row(
                  a,
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    onClick={() => run(() => api(`/api/v1/activity-types/${a.id}`, { method: "PATCH", body: { isActive: true } }), `${a.name} wiederhergestellt.`)}
                    aria-label={`${a.name} wiederherstellen`}
                  >
                    <ArchiveRestore className="size-4" />
                  </Button>,
                ),
              )}
            </ul>
          </details>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Standard-Sportarten"
          description={isAdmin ? "Für alle Benutzer verfügbar. Als Administrator kannst du sie anpassen." : "Für alle verfügbar. Die Intensität lässt sich bei jeder Einheit ändern."}
        />
        <ul className="divide-y divide-border">
          {defaults.map((a) =>
            row(
              a,
              isAdmin ? (
                <Button variant="ghost" size="icon" onClick={() => edit(a)} aria-label={`${a.name} bearbeiten`}>
                  <Pencil className="size-4" />
                </Button>
              ) : null,
            ),
          )}
        </ul>
      </Card>

      {form && <ActivityTypeDialog initial={form} onClose={() => setForm(null)} />}
      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={async () => {
          if (archiving) await run(() => api(`/api/v1/activity-types/${archiving.id}`, { method: "DELETE" }), `${archiving.name} archiviert.`);
        }}
        loading={busy}
        confirmLabel="Archivieren"
        title="Sportart archivieren?"
        description="Archivierte Sportarten stehen beim Erfassen nicht mehr zur Auswahl. Bestehende Einheiten bleiben unverändert erhalten."
      />
      <ConfirmDialog
        open={!!suggesting}
        onClose={() => setSuggesting(null)}
        onConfirm={async () => {
          if (suggesting) await run(() => api(`/api/v1/activity-types/${suggesting.id}/suggestion`, { method: "POST" }), `${suggesting.name} wurde zur Freigabe vorgeschlagen.`);
        }}
        loading={busy}
        tone="primary"
        confirmLabel="Vorschlagen"
        title={suggesting ? `„${suggesting.name}“ für alle vorschlagen?` : ""}
        description="Die Administration prüft den Vorschlag. Nach der Freigabe wird die Sportart zur Standard-Sportart für alle – du kannst sie dann nicht mehr selbst bearbeiten. Deine bisherigen Einheiten bleiben unverändert."
      />
    </div>
  );
}

function ActivityTypeDialog({ initial, onClose }: { initial: FormState; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const body = { name: f.name, description: f.description || null, icon: f.icon, defaultIntensity: f.defaultIntensity, isFavorite: f.isFavorite };
    try {
      if (f.id) await api(`/api/v1/activity-types/${f.id}`, { method: "PATCH", body });
      else await api("/api/v1/activity-types", { method: "POST", body });
      toast(f.id ? "Sportart gespeichert." : "Sportart angelegt.");
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
    <Dialog open onClose={onClose} title={f.id ? "Sportart bearbeiten" : "Neue Sportart"} description="Änderungen wirken nur auf künftige Einheiten.">
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <Field label="Name" htmlFor="a-name" error={fields.name}>
          <Input id="a-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} required autoFocus />
        </Field>
        <Field label="Beschreibung" htmlFor="a-desc" error={fields.description}>
          <Input id="a-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={200} placeholder="optional" />
        </Field>
        <Field label="Standard-Intensität" htmlFor="a-int" error={fields.defaultIntensity} hint="Beim Erfassen voreingestellt, pro Einheit änderbar.">
          <Select id="a-int" value={f.defaultIntensity} onChange={(e) => setF({ ...f, defaultIntensity: e.target.value as Intensity })}>
            {INTENSITIES.map((i) => (
              <option key={i} value={i}>
                {INTENSITY_LABELS[i]}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Symbol</legend>
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITY_ICONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setF({ ...f, icon: key })}
                aria-pressed={f.icon === key}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border p-2 text-xs",
                  f.icon === key ? "border-primary bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))] text-primary" : "border-border text-fg-muted hover:bg-muted",
                )}
              >
                <ActivityIcon icon={key} className="size-5" />
                {ACTIVITY_ICON_LABELS[key]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.isFavorite} onChange={(e) => setF({ ...f, isFavorite: e.target.checked })} className="size-4 accent-[var(--primary)]" />
          Als Favorit beim Erfassen anzeigen
        </label>
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
