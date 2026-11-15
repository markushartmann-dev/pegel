import { requireAdmin } from "@/server/page-auth";
import { PageHeader } from "@/components/ui";
import { AdminTabs } from "@/features/admin/admin-tabs";
import { pendingSuggestionCount } from "@/server/services/suggestions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const pending = await pendingSuggestionCount();
  return (
    <>
      <PageHeader title="Administration" description="Benutzerverwaltung, Getränke-Vorschläge und Aktivitätsprotokoll. Alle Aktionen werden protokolliert." />
      <AdminTabs pendingSuggestions={pending} />
      <div className="mt-6">{children}</div>
    </>
  );
}
