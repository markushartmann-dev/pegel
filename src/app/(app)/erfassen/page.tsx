import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/page-auth";
import { listBeverages } from "@/server/services/beverages";
import { entriesForDay } from "@/server/services/entries";
import { activitiesForDay, listActivityTypes } from "@/server/services/activities";
import { Card, CardHeader, PageHeader, SegmentedLinks } from "@/components/ui";
import { LogForm } from "@/features/consumption/log-form";
import { EntryList } from "@/features/consumption/entry-list";
import { ActivityForm } from "@/features/activities/activity-form";
import { ActivityList } from "@/features/activities/activity-list";
import { dayKey, formatDayKey, isValidDayKey } from "@/lib/dates";
import { formatDuration } from "@/lib/activities";
import { formatGrams } from "@/i18n";

export const metadata: Metadata = { title: "Erfassen" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ tag?: string; art?: string }> }) {
  const user = await requireOnboardedUser();
  const { tag, art } = await searchParams;
  const sport = art === "sport";
  const today = dayKey(new Date(), user.timezone);
  const day = tag && isValidDayKey(tag) && tag <= today ? tag : today;
  const isToday = day === today;
  const tabHref = (a: "getraenk" | "sport") => `/erfassen?${new URLSearchParams({ ...(a === "sport" ? { art: "sport" } : {}), ...(isToday ? {} : { tag: day }) })}`;
  const tabs = (
    <SegmentedLinks
      label="Was erfassen?"
      active={sport ? "sport" : "getraenk"}
      items={[
        { value: "getraenk", label: "Getränk", href: tabHref("getraenk") },
        { value: "sport", label: "Sport", href: tabHref("sport") },
      ]}
    />
  );

  if (sport) {
    const [types, activities] = await Promise.all([listActivityTypes(user.id), activitiesForDay(user, day)]);
    const minutes = activities.reduce((a, e) => a + e.durationMin, 0);
    return (
      <>
        <PageHeader
          title="Sport erfassen"
          description={isToday ? "Sportart antippen, Dauer und Intensität wählen, fertig." : `Nachtrag für ${formatDayKey(day, "long")}.`}
          actions={tabs}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <ActivityForm key={user.timezone} types={types} timezone={user.timezone} defaultDay={isToday ? undefined : day} />
          </Card>
          <Card>
            <CardHeader title={isToday ? "Heute erfasst" : formatDayKey(day, "long")} description={activities.length ? `Summe: ${formatDuration(minutes)}` : undefined} />
            {activities.length ? <ActivityList entries={activities} timezone={user.timezone} showDate={false} /> : <p className="text-sm text-fg-muted">Noch keine Einheit erfasst.</p>}
          </Card>
        </div>
      </>
    );
  }

  const [beverages, entries] = await Promise.all([listBeverages(user.id), entriesForDay(user, day)]);
  const sum = entries.reduce((a, e) => a + e.alcoholGrams, 0);
  return (
    <>
      <PageHeader
        title="Getränk erfassen"
        description={isToday ? "Getränk antippen, Anzahl wählen, fertig. Der Zeitpunkt ist auf jetzt voreingestellt." : `Nachtrag für ${formatDayKey(day, "long")}.`}
        actions={tabs}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <LogForm key={user.timezone} beverages={beverages} timezone={user.timezone} defaultDay={isToday ? undefined : day} />
        </Card>
        <Card>
          <CardHeader title={isToday ? "Heute erfasst" : formatDayKey(day, "long")} description={entries.length ? `Summe: ${formatGrams(sum)}` : undefined} />
          {entries.length ? <EntryList entries={entries} timezone={user.timezone} showDate={false} /> : <p className="text-sm text-fg-muted">Noch nichts erfasst.</p>}
        </Card>
      </div>
    </>
  );
}
