import { requireAdmin } from "@/server/page-auth";
import { PageHeader } from "@/components/ui";
import { AdminTabs } from "@/features/admin/admin-tabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Administration" description="Benutzerverwaltung und Aktivitätsprotokoll. Alle Aktionen werden protokolliert." />
      <AdminTabs />
      <div className="mt-6">{children}</div>
    </>
  );
}
