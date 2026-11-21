import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { requireAdmin } from "@/server/page-auth";
import { listActivitySuggestions, listSuggestions } from "@/server/services/suggestions";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { SuggestionActions } from "@/features/admin/suggestion-actions";
import { BeverageIcon } from "@/features/consumption/log-form";
import { ActivityIcon } from "@/features/activities/activity-icon";
import { formatDateTime } from "@/lib/dates";
import { INTENSITY_LABELS } from "@/lib/activities";
import { formatNumber, t } from "@/i18n";

export const metadata: Metadata = { title: "Vorschläge" };

export default async function SuggestionsPage() {
  const admin = await requireAdmin();
  const [suggestions, activities] = await Promise.all([listSuggestions(), listActivitySuggestions()]);
  if (suggestions.length === 0 && activities.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Lightbulb className="size-6" />} title="Keine offenen Vorschläge">
          Benutzer können eigene Getränke unter „Getränke“ und eigene Sportarten unter „Sportarten“ für alle vorschlagen. Offene Vorschläge erscheinen hier zur
          Freigabe.
        </EmptyState>
      </Card>
    );
  }
  const by = (owner: { name: string } | null, at: Date | null) => (
    <p className="mt-1 text-xs text-fg-muted">
      Vorgeschlagen von {owner?.name ?? "unbekannt"}
      {at ? ` am ${formatDateTime(at, admin.timezone)}` : ""}
    </p>
  );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">
        Freigegebene Vorschläge werden zu Standardgetränken bzw. Standard-Sportarten und stehen allen zur Verfügung. Werte kannst du danach unter „Getränke“ bzw.
        „Sportarten“ noch anpassen.
      </p>
      {suggestions.length > 0 && <CardHeader title={`Getränke (${suggestions.length})`} />}
      {suggestions.map((s) => (
        <Card key={s.id}>
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-fg-muted">
              <BeverageIcon category={s.category} className="size-5" />
            </span>
            <div className="min-w-[12rem] flex-1">
              <p className="font-semibold break-words">{s.name}</p>
              <p className="text-sm text-fg-muted break-words">
                {t.categories[s.category]} · {s.volumeMl} ml · {formatNumber(s.abv, 1)} % vol · {formatNumber(s.alcoholGrams, 1)} g Alkohol
                {s.description ? ` · ${s.description}` : ""}
              </p>
              {by(s.owner, s.suggestedAt)}
            </div>
            <SuggestionActions id={s.id} name={s.name} />
          </div>
        </Card>
      ))}
      {activities.length > 0 && <CardHeader title={`Sportarten (${activities.length})`} />}
      {activities.map((a) => (
        <Card key={a.id}>
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-fg-muted">
              <ActivityIcon icon={a.icon} className="size-5" />
            </span>
            <div className="min-w-[12rem] flex-1">
              <p className="font-semibold break-words">{a.name}</p>
              <p className="text-sm text-fg-muted break-words">
                Standard-Intensität: {INTENSITY_LABELS[a.defaultIntensity]}
                {a.description ? ` · ${a.description}` : ""}
              </p>
              {by(a.owner, a.suggestedAt)}
            </div>
            <SuggestionActions id={a.id} name={a.name} kind="activity" />
          </div>
        </Card>
      ))}
    </div>
  );
}
