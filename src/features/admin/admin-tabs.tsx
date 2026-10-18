"use client";

import { usePathname } from "next/navigation";
import { SegmentedLinks } from "@/components/ui";

export function AdminTabs() {
  const pathname = usePathname();
  const active = pathname.startsWith("/admin/protokoll") ? "log" : "users";
  return (
    <SegmentedLinks
      label="Administrationsbereiche"
      active={active}
      items={[
        { value: "users", label: "Benutzer", href: "/admin" },
        { value: "log", label: "Aktivitätsprotokoll", href: "/admin/protokoll" },
      ]}
    />
  );
}
