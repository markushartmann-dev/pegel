"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import { Dialog, useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";

export function SuggestionActions({ id, name, kind = "beverage" }: { id: string; name: string; kind?: "beverage" | "activity" }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function review(body: Record<string, string>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await api(kind === "activity" ? `/api/v1/admin/activity-suggestions/${id}` : `/api/v1/admin/suggestions/${id}`, { method: "POST", body });
      toast(message);
      setRejecting(false);
      router.refresh();
    } catch (e) {
      const msg = (e as ApiError).message;
      if (rejecting) setError(msg);
      else toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
      <Button onClick={() => review({ decision: "approve" }, kind === "activity" ? `„${name}“ ist jetzt eine Standard-Sportart.` : `„${name}“ ist jetzt ein Standardgetränk.`)} loading={busy && !rejecting}>
        <Check className="size-4" aria-hidden /> Freigeben
      </Button>
      <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
        <X className="size-4" aria-hidden /> Ablehnen
      </Button>
      <Dialog open={rejecting} onClose={() => setRejecting(false)} title={`„${name}“ ablehnen`} description={kind === "activity" ? "Die Begründung sieht die Person bei ihrer Sportart." : "Die Begründung sieht die Person bei ihrem Getränk."}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void review({ decision: "reject", note }, "Vorschlag abgelehnt.");
          }}
        >
          <Field label="Begründung" htmlFor={`reject-note-${id}`}>
            <Textarea id={`reject-note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="z. B. Alkoholgehalt bitte vom Etikett prüfen" />
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejecting(false)}>
              Abbrechen
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              Ablehnen
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
