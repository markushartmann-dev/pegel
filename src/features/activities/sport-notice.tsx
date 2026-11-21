"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dumbbell, X } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api-client";

/** Einmaliger Hinweis für Konten, die vor dem Sport-Tracking angelegt wurden. */
export function SportNotice() {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  async function dismiss() {
    setHidden(true);
    await api("/api/v1/me/notices/sport", { method: "POST" }).catch(() => undefined);
    router.refresh();
  }
  return (
    <div role="status" className="mb-6 flex gap-3 rounded-[var(--radius-sm)] border border-[color-mix(in_oklab,var(--success)_40%,var(--border))] bg-[color-mix(in_oklab,var(--success)_8%,var(--card))] p-3 text-sm">
      <Dumbbell className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Neu: Sport-Tracking</p>
        <p className="mt-0.5 text-fg-muted">
          Unter <Link href="/erfassen?art=sport" className="text-primary underline">Erfassen → Sport</Link> kannst du jetzt Bewegung festhalten – mit Wochenziel nach
          WHO-Richtwert und eigenem Community-Ranking. Sport wird nicht mit Alkohol verrechnet. Die{" "}
          <Link href="/datenschutz" className="text-primary underline">Datenschutzhinweise</Link> wurden um Sportdaten ergänzt.
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Hinweis ausblenden">
        <X className="size-4" />
      </Button>
    </div>
  );
}
