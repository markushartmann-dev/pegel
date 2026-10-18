"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";

export function DeleteAccount() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/v1/me/delete", { method: "POST", body: { password, confirm } });
      router.replace("/anmelden");
      router.refresh();
    } catch (err) {
      setError((err as ApiError).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <Field label="Passwort" htmlFor="del-password">
        <Input id="del-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Field label={'Zur Bestätigung „LÖSCHEN“ eingeben'} htmlFor="del-confirm">
        <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" required />
      </Field>
      <Button type="submit" variant="danger" loading={loading} disabled={confirm !== "LÖSCHEN" || !password}>
        Konto endgültig löschen
      </Button>
      {error && (
        <Alert tone="danger" className="sm:col-span-3">
          {error}
        </Alert>
      )}
    </form>
  );
}
