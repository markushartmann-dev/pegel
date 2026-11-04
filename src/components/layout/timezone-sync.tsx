"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/components/ui/client";
import { api } from "@/lib/api-client";
import { timeZoneCity } from "@/lib/dates";

/**
 * Übernimmt die Zeitzone des Geräts ins Profil, z. B. auf Reisen. Tagesgrenzen, „jetzt“ und
 * Erinnerungen folgen damit dem aktuellen Aufenthaltsort. Abschaltbar in den Einstellungen.
 */
export function TimezoneSync({ timezone, auto }: { timezone: string; auto: boolean }) {
  const router = useRouter();
  const toast = useToast();
  useEffect(() => {
    if (!auto) return;
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!device || device === timezone) return;
    api<{ changed: boolean }>("/api/v1/me/timezone", { method: "POST", body: { timezone: device } })
      .then((r) => {
        if (!r.changed) return;
        toast(`Zeitzone auf ${timeZoneCity(device)} umgestellt (vom Gerät erkannt).`);
        router.refresh();
      })
      .catch(() => undefined);
  }, [auto, timezone, router, toast]);
  return null;
}
