"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";

export function CommunitySettings({
  initial,
  displayName,
}: {
  initial: { optIn: boolean; display: "PSEUDONYM" | "DISPLAY_NAME"; pseudonym: string };
  displayName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [optIn, setOptIn] = useState(initial.optIn);
  const [display, setDisplay] = useState(initial.display);
  const [pseudonym, setPseudonym] = useState(initial.pseudonym);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/v1/me/community", { method: "PUT", body: { optIn, display, pseudonym: pseudonym.trim() || null } });
      toast(optIn ? "Teilnahme gespeichert." : "Du nimmst nicht am Ranking teil.");
      router.refresh();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span>
          Ich willige ein, dass meine erfasste Gesamtmenge (Gramm reiner Alkohol) anderen angemeldeten Benutzern dieser App im Ranking angezeigt wird.
        </span>
      </label>
      {optIn && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Angezeigt als</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="display" checked={display === "PSEUDONYM"} onChange={() => setDisplay("PSEUDONYM")} className="accent-[var(--primary)]" />
            Pseudonym (empfohlen)
          </label>
          {display === "PSEUDONYM" && (
            <Field label="Pseudonym" htmlFor="pseudonym" hint="Wähle einen Namen, der keine Rückschlüsse auf dich zulässt.">
              <Input id="pseudonym" value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} maxLength={30} />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="display" checked={display === "DISPLAY_NAME"} onChange={() => setDisplay("DISPLAY_NAME")} className="accent-[var(--primary)]" />
            Anzeigename „{displayName}“
          </label>
        </fieldset>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" loading={loading}>
        Speichern
      </Button>
    </form>
  );
}
