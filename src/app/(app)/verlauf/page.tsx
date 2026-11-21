import type { Metadata } from "next";
import { Dumbbell, History } from "lucide-react";
import { requireOnboardedUser } from "@/server/page-auth";
import { historyPage } from "@/server/services/entries";
import { listBeverages } from "@/server/services/beverages";
import { activityHistoryPage, listActivityTypes } from "@/server/services/activities";
import { Button, Card, EmptyState, Field, Input, LinkButton, PageHeader, Pagination, SegmentedLinks, Select } from "@/components/ui";
import { EntryList } from "@/features/consumption/entry-list";
import { ActivityList } from "@/features/activities/activity-list";
import { isValidDayKey } from "@/lib/dates";
import { formatDuration } from "@/lib/activities";
import { countLabel, formatGrams } from "@/i18n";

export const metadata: Metadata = { title: "Verlauf" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const sport = sp.art === "sport";
  const selectedId = (sport ? sp.sportart : sp.getraenk) || undefined;
  const filters = {
    page: sp.seite ?? "1",
    ...(sport ? { activityTypeId: selectedId } : { beverageId: selectedId }),
    from: sp.von && isValidDayKey(sp.von) ? sp.von : undefined,
    to: sp.bis && isValidDayKey(sp.bis) ? sp.bis : undefined,
  };
  const base = sport ? "/verlauf?art=sport" : "/verlauf";
  const qs = (page: number) => {
    const p = new URLSearchParams();
    if (sport) p.set("art", "sport");
    if (selectedId) p.set(sport ? "sportart" : "getraenk", selectedId);
    if (filters.from) p.set("von", filters.from);
    if (filters.to) p.set("bis", filters.to);
    p.set("seite", String(page));
    return `/verlauf?${p}`;
  };
  const filtered = !!(selectedId || filters.from || filters.to);

  const options = sport
    ? (await listActivityTypes(user.id, { includeArchived: true })).map((a) => ({ id: a.id, name: a.name, isActive: a.isActive }))
    : (await listBeverages(user.id, { includeArchived: true })).map((b) => ({ id: b.id, name: b.name, isActive: b.isActive }));

  const tabs = (
    <SegmentedLinks
      label="Verlauf von"
      active={sport ? "sport" : "getraenk"}
      items={[
        { value: "getraenk", label: "Getränke", href: "/verlauf" },
        { value: "sport", label: "Sport", href: "/verlauf?art=sport" },
      ]}
    />
  );

  const filterForm = (
    <Card className="mb-6">
      <form method="get" className="grid gap-3 sm:grid-cols-4 sm:items-end">
        {sport && <input type="hidden" name="art" value="sport" />}
        <Field label={sport ? "Sportart" : "Getränk"} htmlFor="filter-item">
          <Select id="filter-item" name={sport ? "sportart" : "getraenk"} defaultValue={selectedId ?? ""}>
            <option value="">{sport ? "Alle Sportarten" : "Alle Getränke"}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {!o.isActive ? " (archiviert)" : ""}
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
            <LinkButton href={base} variant="outline">
              Zurücksetzen
            </LinkButton>
          )}
        </div>
      </form>
    </Card>
  );

  if (sport) {
    const result = await activityHistoryPage(user, filters);
    return (
      <>
        <PageHeader title="Verlauf" description="Alle Sporteinheiten chronologisch, neueste zuerst." actions={tabs} />
        {filterForm}
        <Card>
          {result.items.length ? (
            <>
              <p className="mb-2 text-sm text-fg-muted tabular">
                {countLabel(result.total, "Einheit", "Einheiten")} · {formatDuration(result.sumMinutes)} insgesamt
              </p>
              <ActivityList entries={result.items} timezone={user.timezone} />
              <Pagination page={result.page} pages={result.pages} hrefFor={qs} />
            </>
          ) : (
            <EmptyState icon={<Dumbbell className="size-6" />} title={filtered ? "Keine Einheiten für diese Filter" : "Noch keine Sporteinheiten"}>
              {filtered ? "Passe die Filter an oder setze sie zurück." : "Erfasste Sporteinheiten erscheinen hier."}
            </EmptyState>
          )}
        </Card>
      </>
    );
  }

  const result = await historyPage(user, filters);
  return (
    <>
      <PageHeader title="Verlauf" description="Alle Einträge chronologisch, neueste zuerst." actions={tabs} />
      {filterForm}
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
