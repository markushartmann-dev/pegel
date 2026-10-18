"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardHeader } from "@/components/ui";
import { useToast } from "@/components/ui/client";
import { api } from "@/lib/api-client";
import { applyTheme, ThemePicker, type Mode, type Scheme } from "@/features/profile/theme-picker";

export function AppearanceSettings({ scheme: s0, mode: m0 }: { scheme: Scheme; mode: Mode }) {
  const router = useRouter();
  const toast = useToast();
  const [scheme, setScheme] = useState(s0);
  const [mode, setMode] = useState(m0);
  const [saving, setSaving] = useState(false);
  const dirty = scheme !== s0 || mode !== m0;

  async function save() {
    setSaving(true);
    try {
      await api("/api/v1/me", { method: "PATCH", body: { colorScheme: scheme, themeMode: mode } });
      toast("Darstellung gespeichert – sie gilt auf allen deinen Geräten.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader title="Darstellung" description="Die Auswahl wird in deinem Profil gespeichert und auf alle Bereiche der App angewendet." />
      <ThemePicker
        scheme={scheme}
        mode={mode}
        onChange={(s, m) => {
          setScheme(s);
          setMode(m);
          applyTheme(s, m);
        }}
      />
      <div className="mt-6 flex justify-end gap-2">
        {dirty && (
          <Button
            variant="ghost"
            onClick={() => {
              setScheme(s0);
              setMode(m0);
              applyTheme(s0, m0);
            }}
          >
            Zurücksetzen
          </Button>
        )}
        <Button onClick={save} loading={saving} disabled={!dirty}>
          Speichern
        </Button>
      </div>
    </Card>
  );
}
