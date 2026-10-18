import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/page-auth";
import { listBeverages } from "@/server/services/beverages";
import { entriesForDay } from "@/server/services/entries";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { LogForm } from "@/features/consumption/log-form";
import { EntryList } from "@/features/consumption/entry-list";
import { dayKey, formatDayKey, isValidDayKey } from "@/lib/dates";
import { formatGrams } from "@/i18n";

export const metadata: Metadata = { title: "Erfassen" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const user = await requireOnboardedUser();
  const { tag } = await searchParams;
  const today = dayKey(new Date(), user.timezone);
  const day = tag && isValidDayKey(tag) && tag <= today ? tag : today;
  const [beverages, entries] = await Promise.all([listBeverages(user.id), entriesForDay(user, day)]);
  const sum = entries.reduce((a, e) => a + e.alcoholGrams, 0);
  return (
    <>
      <PageHeader
        title="Getränk erfassen"
        description={day === today ? "Getränk antippen, Anzahl wählen, fertig. Der Zeitpunkt ist auf jetzt voreingestellt." : `Nachtrag für ${formatDayKey(day, "long")}.`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <LogForm beverages={beverages} timezone={user.timezone} defaultDay={day === today ? undefined : day} />
        </Card>
        <Card>
          <CardHeader title={day === today ? "Heute erfasst" : formatDayKey(day, "long")} description={entries.length ? `Summe: ${formatGrams(sum)}` : undefined} />
          {entries.length ? <EntryList entries={entries} timezone={user.timezone} showDate={false} /> : <p className="text-sm text-fg-muted">Noch nichts erfasst.</p>}
        </Card>
      </div>
    </>
  );
}
