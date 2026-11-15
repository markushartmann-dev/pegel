"use client";

import { usePathname } from "next/navigation";
import { SegmentedLinks } from "@/components/ui";

export function AdminTabs({ pendingSuggestions = 0 }: { pendingSuggestions?: number }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/admin/protokoll") ? "log" : pathname.startsWith("/admin/vorschlaege") ? "suggestions" : "users";
  return (
    <SegmentedLinks
      label="Administrationsbereiche"
      active={active}
      items={[
        { value: "users", label: "Benutzer", href: "/admin" },
        { value: "suggestions", label: pendingSuggestions > 0 ? `Vorschläge (${pendingSuggestions})` : "Vorschläge", href: "/admin/vorschlaege" },
        { value: "log", label: "Aktivitätsprotokoll", href: "/admin/protokoll" },
      ]}
    />
  );
}
