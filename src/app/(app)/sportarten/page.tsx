import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/page-auth";
import { listActivityTypes } from "@/server/services/activities";
import { PageHeader } from "@/components/ui";
import { ActivityTypeManager } from "@/features/activities/activity-type-manager";

export const metadata: Metadata = { title: "Sportarten" };

export default async function ActivityTypesPage() {
  const user = await requireOnboardedUser();
  const types = await listActivityTypes(user.id, { includeArchived: true });
  return (
    <>
      <PageHeader
        title="Sportarten"
        description="Eigene Sportarten mit Symbol und üblicher Intensität anlegen. Dauer und Intensität wählst du bei jeder Einheit neu."
      />
      <ActivityTypeManager types={types} isAdmin={user.role === "ADMIN"} />
    </>
  );
}
