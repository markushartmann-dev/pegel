"use client";

import { usePathname } from "next/navigation";
import { SegmentedLinks } from "@/components/ui";

const TABS = [
  { value: "/einstellungen", label: "Profil" },
  { value: "/einstellungen/darstellung", label: "Darstellung" },
  { value: "/einstellungen/benachrichtigungen", label: "Benachrichtigungen" },
  { value: "/einstellungen/sicherheit", label: "Sicherheit" },
  { value: "/einstellungen/daten", label: "Daten & Datenschutz" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return <SegmentedLinks label="Bereiche" active={pathname} items={TABS.map((t) => ({ ...t, href: t.value }))} />;
}
