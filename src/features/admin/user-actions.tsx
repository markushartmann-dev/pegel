"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, KeyRound, LogOut, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { Alert, Button, Input } from "@/components/ui";
import { ConfirmDialog, Dialog, useToast } from "@/components/ui/client";
import { api } from "@/lib/api-client";

type U = { id: string; name: string; role: "USER" | "ADMIN"; status: "ACTIVE" | "DEACTIVATED" };
type Action = "status" | "role" | "sessions" | "delete" | null;

export function UserActions({ user, isSelf }: { user: U; isSelf: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, msg: string, after?: () => void) {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      setConfirm(null);
      if (after) after();
      else router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const deactivate = user.status === "ACTIVE";
  const promote = user.role === "USER";

  const dialogs: Record<Exclude<Action, null>, { title: string; description: string; label: string; fn: () => Promise<unknown>; msg: string; after?: () => void }> = {
    status: {
      title: deactivate ? "Konto deaktivieren?" : "Konto aktivieren?",
      description: deactivate ? `${user.name} kann sich nicht mehr anmelden; alle Sitzungen werden sofort beendet.` : `${user.name} kann sich wieder anmelden.`,
      label: deactivate ? "Deaktivieren" : "Aktivieren",
      fn: () => api(`/api/v1/admin/users/${user.id}`, { method: "PATCH", body: { status: deactivate ? "DEACTIVATED" : "ACTIVE" } }),
      msg: deactivate ? "Konto deaktiviert." : "Konto aktiviert.",
    },
    role: {
      title: promote ? "Zum Administrator machen?" : "Administratorrechte entziehen?",
      description: promote ? `${user.name} erhält vollen Zugriff auf die Administration.` : `${user.name} verliert den Zugriff auf die Administration.`,
      label: promote ? "Rechte vergeben" : "Rechte entziehen",
      fn: () => api(`/api/v1/admin/users/${user.id}`, { method: "PATCH", body: { role: promote ? "ADMIN" : "USER" } }),
      msg: "Rolle geändert.",
      after: isSelf && !promote ? () => { router.replace("/dashboard"); router.refresh(); } : undefined,
    },
    sessions: {
      title: "Alle Sitzungen beenden?",
      description: `${user.name} wird auf allen Geräten abgemeldet.`,
      label: "Sitzungen beenden",
      fn: () => api(`/api/v1/admin/users/${user.id}/sessions`, { method: "DELETE" }),
      msg: "Sitzungen beendet.",
      after: isSelf ? () => { router.replace("/anmelden"); router.refresh(); } : undefined,
    },
    delete: {
      title: "Konto endgültig löschen?",
      description: `Konto, Profil, Getränke und alle Einträge von ${user.name} werden unwiderruflich gelöscht. Protokolleinträge bleiben pseudonymisiert erhalten.`,
      label: "Endgültig löschen",
      fn: () => api(`/api/v1/admin/users/${user.id}`, { method: "DELETE" }),
      msg: "Konto gelöscht.",
      after: () => router.replace("/admin"),
    },
  };
  const d = confirm ? dialogs[confirm] : null;

  return (
    <div className="flex flex-col gap-2">
      {!isSelf && (
        <Button variant="outline" onClick={() => setConfirm("status")} className="justify-start">
          {deactivate ? <UserX className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}
          {deactivate ? "Konto deaktivieren" : "Konto aktivieren"}
        </Button>
      )}
      <Button variant="outline" onClick={() => setConfirm("role")} className="justify-start">
        {promote ? <ShieldCheck className="size-4" aria-hidden /> : <ShieldOff className="size-4" aria-hidden />}
        {promote ? "Zum Administrator machen" : "Administratorrechte entziehen"}
      </Button>
      <Button variant="outline" onClick={() => setConfirm("sessions")} className="justify-start">
        <LogOut className="size-4" aria-hidden /> Alle Sitzungen beenden
      </Button>
      {!isSelf && user.status === "ACTIVE" && (
        <Button
          variant="outline"
          className="justify-start"
          loading={busy && !confirm}
          onClick={() =>
            run(
              async () => {
                const r = await api<{ url: string }>(`/api/v1/admin/users/${user.id}/reset-link`, { method: "POST" });
                setResetLink(r.url);
              },
              "Reset-Link erstellt.",
              () => undefined,
            )
          }
        >
          <KeyRound className="size-4" aria-hidden /> Passwort-Reset-Link erzeugen
        </Button>
      )}
      {!isSelf && (
        <Button variant="danger" onClick={() => setConfirm("delete")} className="mt-2 justify-start">
          <Trash2 className="size-4" aria-hidden /> Konto löschen
        </Button>
      )}
      {isSelf && <p className="mt-2 text-xs text-fg-muted">Dein eigenes Konto kannst du hier nicht deaktivieren oder löschen.</p>}

      {d && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={() => run(d.fn, d.msg, d.after)}
          title={d.title}
          description={d.description}
          confirmLabel={d.label}
          tone={confirm === "delete" || (confirm === "status" && deactivate) ? "danger" : "primary"}
          loading={busy}
        />
      )}
      <Dialog open={!!resetLink} onClose={() => setResetLink(null)} title="Einmal-Link zum Zurücksetzen" description="60 Minuten gültig, nur einmal verwendbar. Gib ihn auf sicherem Weg weiter – er wird nicht erneut angezeigt.">
        <div className="flex gap-2">
          <Input readOnly value={resetLink ?? ""} onFocus={(e) => e.currentTarget.select()} aria-label="Reset-Link" />
          <Button
            variant="outline"
            size="icon"
            aria-label="Link kopieren"
            onClick={async () => {
              await navigator.clipboard.writeText(resetLink ?? "");
              toast("Link kopiert.");
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <Alert tone="warning" className="mt-4">
          Wer diesen Link besitzt, kann das Passwort des Kontos ändern.
        </Alert>
      </Dialog>
    </div>
  );
}
