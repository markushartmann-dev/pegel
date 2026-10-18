"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";
import { emptyProfile, profilePayload, ProfileFields, type ProfileValues } from "@/features/profile/profile-fields";

function zones(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Berlin", "UTC"];
  }
}

export function ProfileSettings({
  name: initialName,
  email,
  timezone: initialTz,
  profile,
}: {
  name: string;
  email: string;
  timezone: string;
  profile: ProfileValues | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTz);
  const [values, setValues] = useState<ProfileValues>(profile ?? emptyProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"account" | "profile" | null>(null);
  const tzList = useMemo(() => {
    const z = zones();
    return z.includes(initialTz) ? z : [initialTz, ...z];
  }, [initialTz]);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving("account");
    setError(null);
    try {
      await api("/api/v1/me", { method: "PATCH", body: { name: name.trim(), timezone } });
      toast("Konto gespeichert.");
      router.refresh();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSaving(null);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving("profile");
    setError(null);
    setErrors({});
    try {
      await api("/api/v1/me/profile", { method: "PUT", body: profilePayload(values) });
      toast("Profil gespeichert. Bestehende Einträge bleiben unverändert.");
      router.refresh();
    } catch (err) {
      setError((err as ApiError).message);
      setErrors((err as ApiError).fields ?? {});
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Konto" description={`Angemeldet als ${email}`} />
        <form onSubmit={saveAccount} className="flex flex-col gap-4">
          <Field label="Anzeigename" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </Field>
          <Field label="Zeitzone" htmlFor="tz" hint="Bestimmt Tagesgrenzen in Kalender und Statistik.">
            <Select id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {tzList.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={saving === "account"}>
              Speichern
            </Button>
          </div>
        </form>
      </Card>
      <Card>
        <CardHeader
          title="Berechnungsprofil"
          description="Änderungen gelten für künftige Schätzungen. Die bisherigen Werte bleiben als Historie gespeichert."
        />
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <ProfileFields value={values} onChange={setValues} errors={errors} />
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" loading={saving === "profile"}>
              Profil speichern
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
