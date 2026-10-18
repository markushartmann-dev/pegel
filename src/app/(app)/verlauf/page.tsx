import type { Metadata } from "next";
import { History } from "lucide-react";
import { requireOnboardedUser } from "@/server/page-auth";
import { historyPage } from "@/server/services/entries";
import { listBeverages } from "@/server/services/beverages";
import { Button, Card, EmptyState, Field, Input, LinkButton, PageHeader, Pagination, Select } from "@/components/ui";
import { EntryList } from "@/features/consumption/entry-list";
import { isValidDayKey } from "@/lib/dates";
import { countLabel, formatGrams } from "@/i18n";

export const metadata: Metadata = { title: "Verlauf" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const filters = {
    page: sp.seite ?? "1",
    beverageId: sp.getraenk || undefined,
    from: sp.von && isValidDayKey(sp.von) ? sp.von : undefined,
    to: sp.bis && isValidDayKey(sp.bis) ? sp.bis : undefined,
  };
  const [result, beverages] = await Promise.all([historyPage(user, filters), listBeverages(user.id, { includeArchived: true })]);
  const qs = (page: number) => {
    const p = new URLSearchParams();
    if (filters.beverageId) p.set("getraenk", filters.beverageId);
    if (filters.from) p.set("von", filters.from);
    if (filters.to) p.set("bis", filters.to);
    p.set("seite", String(page));
    return `/verlauf?${p}`;
  };
  const filtered = !!(filters.beverageId || filters.from || filters.to);

  return (
    <>
      <PageHeader title="Verlauf" description="Alle Einträge chronologisch, neueste zuerst." />
      <Card className="mb-6">
        <form method="get" className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <Field label="Getränk" htmlFor="getraenk">
            <Select id="getraenk" name="getraenk" defaultValue={filters.beverageId ?? ""}>
              <option value="">Alle Getränke</option>
              {beverages.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {!b.isActive ? " (archiviert)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Von" htmlFor="von">
            <Input id="von" name="von" type="date" defaultValue={filters.from} />
          </Field>
          <Field label="Bis" htmlFor="bis">
            <Input id="bis" name="bis" type="date" defaultValue={filters.to} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Filtern
            </Button>
            {filtered && (
              <LinkButton href="/verlauf" variant="outline">
                Zurücksetzen
              </LinkButton>
            )}
          </div>
        </form>
      </Card>
      <Card>
        {result.items.length ? (
          <>
            <p className="mb-2 text-sm text-fg-muted tabular">
              {countLabel(result.total, "Eintrag", "Einträge")} · {countLabel(result.sumServings, "Portion", "Portionen")} · {formatGrams(result.sumGrams)} reiner Alkohol
            </p>
            <EntryList entries={result.items} timezone={user.timezone} />
            <Pagination page={result.page} pages={result.pages} hrefFor={qs} />
          </>
        ) : (
          <EmptyState icon={<History className="size-6" />} title={filtered ? "Keine Einträge für diese Filter" : "Noch keine Einträge"}>
            {filtered ? "Passe die Filter an oder setze sie zurück." : "Erfasste Getränke erscheinen hier."}
          </EmptyState>
        )}
      </Card>
    </>
  );
}
