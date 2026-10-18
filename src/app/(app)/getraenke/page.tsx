import type { Metadata } from "next";
import { requireOnboardedUser } from "@/server/page-auth";
import { listBeverages } from "@/server/services/beverages";
import { PageHeader } from "@/components/ui";
import { BeverageManager } from "@/features/beverages/beverage-manager";

export const metadata: Metadata = { title: "Getränke" };

export default async function BeveragesPage() {
  const user = await requireOnboardedUser();
  const beverages = await listBeverages(user.id, { includeArchived: true });
  return (
    <>
      <PageHeader
        title="Getränke"
        description="Eigene Getränke mit genauem Volumen und Alkoholgehalt anlegen. Die Menge reinen Alkohols wird automatisch berechnet."
      />
      <BeverageManager beverages={beverages} isAdmin={user.role === "ADMIN"} />
    </>
  );
}
