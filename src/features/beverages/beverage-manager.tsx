"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Megaphone, Pencil, Plus, Star, Undo2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, cn } from "@/components/ui";
import { ConfirmDialog, Dialog, useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";
import { alcoholGrams } from "@/lib/calculations/alcohol";
import { formatNumber, t } from "@/i18n";
import type { BeverageDTO } from "@/server/services/beverages";
import { BeverageIcon } from "@/features/consumption/log-form";

type FormState = { id?: string; name: string; description: string; volumeMl: string; abv: string; category: string; isFavorite: boolean };
const empty: FormState = { name: "", description: "", volumeMl: "500", abv: "5,0", category: "BEER", isFavorite: true };

export function BeverageManager({ beverages, isAdmin }: { beverages: BeverageDTO[]; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [archiving, setArchiving] = useState<BeverageDTO | null>(null);
  const [suggesting, setSuggesting] = useState<BeverageDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const own = beverages.filter((b) => b.own);
  const active = own.filter((b) => b.isActive);
  const archived = own.filter((b) => !b.isActive);
  const defaults = beverages.filter((b) => b.isDefault);

  async function setActive(b: BeverageDTO, isActive: boolean) {
    setBusy(true);
    try {
      if (isActive) await api(`/api/v1/beverages/${b.id}`, { method: "PATCH", body: { isActive: true } });
      else await api(`/api/v1/beverages/${b.id}`, { method: "DELETE" });
      toast(isActive ? `${b.name} wiederhergestellt.` : `${b.name} archiviert.`);
      setArchiving(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(b: BeverageDTO) {
    try {
      await api(`/api/v1/beverages/${b.id}`, { method: "PATCH", body: { isFavorite: !b.isFavorite } });
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function suggest(b: BeverageDTO, withdraw = false) {
    setBusy(true);
    try {
      await api(`/api/v1/beverages/${b.id}/suggestion`, { method: withdraw ? "DELETE" : "POST" });
      toast(withdraw ? "Vorschlag zurückgezogen." : `${b.name} wurde zur Freigabe vorgeschlagen.`);
      setSuggesting(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const edit = (b: BeverageDTO) =>
    setForm({
      id: b.id,
      name: b.name,
      description: b.description ?? "",
      volumeMl: String(b.volumeMl),
      abv: String(b.abv).replace(".", ","),
      category: b.category,
      isFavorite: b.isFavorite,
    });

  const row = (b: BeverageDTO, actions: React.ReactNode) => (
    <li key={b.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 py-3", !b.isActive && "opacity-60")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-fg-muted">
        <BeverageIcon category={b.category} className="size-4" />
      </span>
      <div className="min-w-[9rem] flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium break-words">
          <span className="break-words">{b.name}</span>
          {b.isFavorite && b.own && <Star className="size-3.5 fill-current text-warning" aria-label="Favorit" />}
          {!b.isActive && <Badge>Archiviert</Badge>}
          {b.own && b.isActive && b.suggestionStatus === "PENDING" && <Badge tone="primary">Vorschlag offen</Badge>}
          {b.own && b.isActive && b.suggestionStatus === "REJECTED" && <Badge tone="warning">Vorschlag abgelehnt</Badge>}
        </p>
        <p className="text-xs text-fg-muted tabular break-words">
          {t.categories[b.category]} · {b.volumeMl} ml · {formatNumber(b.abv, 1)} % vol{b.description ? ` · ${b.description}` : ""}
        </p>
        {b.own && b.isActive && b.suggestionStatus === "REJECTED" && b.suggestionNote && (
          <p className="mt-1 text-xs text-warning break-words">Begründung: {b.suggestionNote}</p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <span className="pr-1 text-sm font-semibold tabular">{formatNumber(b.alcoholGrams, 1)} g</span>
        {actions}
      </div>
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Meine Getränke"
          description="Nur für dich sichtbar. Favoriten erscheinen beim Erfassen zuerst. Mit dem Megafon schlägst du ein Getränk für alle vor."
          action={
            <Button size="sm" onClick={() => setForm(empty)}>
              <Plus className="size-4" aria-hidden /> Neu
            </Button>
          }
        />
        {active.length ? (
          <ul className="divide-y divide-border">
            {active.map((b) =>
              row(
                b,
                <>
                  <Button variant="ghost" size="icon" onClick={() => toggleFavorite(b)} aria-label={b.isFavorite ? `${b.name} als Favorit entfernen` : `${b.name} als Favorit markieren`} aria-pressed={b.isFavorite}>
                    <Star className={cn("size-4", b.isFavorite && "fill-current text-warning")} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => edit(b)} aria-label={`${b.name} bearbeiten`}>
                    <Pencil className="size-4" />
                  </Button>
                  {b.suggestionStatus === "PENDING" ? (
                    <Button variant="ghost" size="icon" onClick={() => suggest(b, true)} disabled={busy} aria-label={`Vorschlag für ${b.name} zurückziehen`} title="Vorschlag zurückziehen">
                      <Undo2 className="size-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setSuggesting(b)} aria-label={`${b.name} für alle vorschlagen`} title="Für alle vorschlagen">
                      <Megaphone className="size-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setArchiving(b)} aria-label={`${b.name} archivieren`}>
                    <Archive className="size-4" />
                  </Button>
                </>,
              ),
            )}
          </ul>
        ) : (
          <EmptyState title="Noch keine eigenen Getränke" action={<Button onClick={() => setForm(empty)}>Getränk anlegen</Button>}>
            Lege z. B. dein Lieblingsbier mit dem Alkoholgehalt vom Etikett an.
          </EmptyState>
        )}
        {archived.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-fg-muted">Archiviert ({archived.length})</summary>
            <ul className="divide-y divide-border">
              {archived.map((b) =>
                row(
                  b,
                  <Button variant="ghost" size="icon" onClick={() => setActive(b, true)} aria-label={`${b.name} wiederherstellen`} disabled={busy}>
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
          title="Standardgetränke"
          description={isAdmin ? "Für alle Benutzer verfügbar. Als Administrator kannst du die Werte anpassen." : "Für alle verfügbar. Typische Startwerte – für genaue Werte eigene Getränke anlegen."}
        />
        <ul className="divide-y divide-border">
          {defaults.map((b) =>
            row(
              b,
              isAdmin ? (
                <Button variant="ghost" size="icon" onClick={() => edit(b)} aria-label={`${b.name} bearbeiten`}>
                  <Pencil className="size-4" />
                </Button>
              ) : null,
            ),
          )}
        </ul>
      </Card>

      {form && <BeverageDialog initial={form} onClose={() => setForm(null)} />}
      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={async () => { if (archiving) await setActive(archiving, false); }}
        loading={busy}
        confirmLabel="Archivieren"
        title="Getränk archivieren?"
        description="Archivierte Getränke stehen beim Erfassen nicht mehr zur Auswahl. Bestehende Einträge bleiben unverändert erhalten."
      />
      <ConfirmDialog
        open={!!suggesting}
        onClose={() => setSuggesting(null)}
        onConfirm={async () => { if (suggesting) await suggest(suggesting); }}
        loading={busy}
        tone="primary"
        confirmLabel="Vorschlagen"
        title={suggesting ? `„${suggesting.name}“ für alle vorschlagen?` : ""}
        description="Die Administration prüft den Vorschlag. Nach der Freigabe wird das Getränk zum Standardgetränk für alle – du kannst es dann nicht mehr selbst bearbeiten. Deine bisherigen Einträge bleiben unverändert."
      />
    </div>
  );
}

function BeverageDialog({ initial, onClose }: { initial: FormState; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  let grams = NaN;
  try {
    grams = alcoholGrams(Number(f.volumeMl), Number(f.abv.replace(",", ".")));
  } catch {
    /* ungültig */
  }
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    const body = {
      name: f.name,
      description: f.description || null,
      volumeMl: Number(f.volumeMl),
      abv: Number(f.abv.replace(",", ".")),
      category: f.category,
      isFavorite: f.isFavorite,
    };
    try {
      if (f.id) await api(`/api/v1/beverages/${f.id}`, { method: "PATCH", body });
      else await api("/api/v1/beverages", { method: "POST", body });
      toast(f.id ? "Getränk gespeichert." : "Getränk angelegt.");
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
    <Dialog open onClose={onClose} title={f.id ? "Getränk bearbeiten" : "Neues Getränk"} description="Änderungen wirken nur auf künftige Einträge.">
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <Field label="Name" htmlFor="b-name" error={fields.name}>
          <Input id="b-name" value={f.name} onChange={set("name")} maxLength={60} required autoFocus />
        </Field>
        <Field label="Beschreibung" htmlFor="b-desc" error={fields.description}>
          <Input id="b-desc" value={f.description} onChange={set("description")} maxLength={200} placeholder="optional" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Volumen (ml)" htmlFor="b-vol" error={fields.volumeMl} hint="1–5000 ml">
            <Input id="b-vol" inputMode="numeric" value={f.volumeMl} onChange={set("volumeMl")} />
          </Field>
          <Field label="Alkohol (% vol)" htmlFor="b-abv" error={fields.abv} hint="0–96, eine Nachkommastelle">
            <Input id="b-abv" inputMode="decimal" value={f.abv} onChange={set("abv")} />
          </Field>
        </div>
        <Field label="Kategorie" htmlFor="b-cat" error={fields.category}>
          <Select id="b-cat" value={f.category} onChange={set("category")}>
            {Object.entries(t.categories).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.isFavorite} onChange={(e) => setF({ ...f, isFavorite: e.target.checked })} className="size-4 accent-[var(--primary)]" />
          Als Favorit beim Erfassen anzeigen
        </label>
        <div className="rounded-[var(--radius-sm)] bg-muted p-3 text-sm">
          Reiner Alkohol je Portion:{" "}
          <strong className="tabular">{Number.isFinite(grams) ? `${formatNumber(grams, 1)} g` : "–"}</strong>
          <span className="block text-xs text-fg-muted">= Volumen × Alkoholgehalt × 0,789 g/ml</span>
        </div>
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
