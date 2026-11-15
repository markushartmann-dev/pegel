import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { requireAdmin } from "@/server/page-auth";
import { listSuggestions } from "@/server/services/suggestions";
import { Card, EmptyState } from "@/components/ui";
import { SuggestionActions } from "@/features/admin/suggestion-actions";
import { BeverageIcon } from "@/features/consumption/log-form";
import { formatDateTime } from "@/lib/dates";
import { formatNumber, t } from "@/i18n";

export const metadata: Metadata = { title: "Getränke-Vorschläge" };

export default async function SuggestionsPage() {
  const admin = await requireAdmin();
  const suggestions = await listSuggestions();
  if (suggestions.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Lightbulb className="size-6" />} title="Keine offenen Vorschläge">
          Benutzer können eigene Getränke unter „Getränke“ für alle vorschlagen. Offene Vorschläge erscheinen hier zur Freigabe.
        </EmptyState>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">
        Freigegebene Getränke werden zu Standardgetränken und stehen allen zur Verfügung. Werte kannst du danach unter „Getränke“ noch anpassen.
      </p>
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
              <p className="mt-1 text-xs text-fg-muted">
                Vorgeschlagen von {s.owner?.name ?? "unbekannt"}
                {s.suggestedAt ? ` am ${formatDateTime(s.suggestedAt, admin.timezone)}` : ""}
              </p>
            </div>
            <SuggestionActions id={s.id} name={s.name} />
          </div>
        </Card>
      ))}
    </div>
  );
}
