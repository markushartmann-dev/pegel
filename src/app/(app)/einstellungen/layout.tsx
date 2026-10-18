import { PageHeader } from "@/components/ui";
import { SettingsTabs } from "@/features/settings/settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Einstellungen" description="Profil, Darstellung, Benachrichtigungen, Sitzungen und deine Daten." />
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </>
  );
}
