"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ShieldCheck, Scale, Palette } from "lucide-react";
import { Alert, Button, Card, Field, Select, cn } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { emptyProfile, profilePayload, ProfileFields, type ProfileValues } from "./profile-fields";
import { applyTheme, ThemePicker, type Mode, type Scheme } from "./theme-picker";
import { t } from "@/i18n";

const STEPS = [
  { title: "Datenschutz & Modell", icon: ShieldCheck },
  { title: "Berechnungsprofil", icon: Scale },
  { title: "Zeitzone & Darstellung", icon: Palette },
];

function timezones(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Berlin", "Europe/Vienna", "Europe/Zurich", "UTC"];
  }
}

export function OnboardingWizard({
  initialTimezone,
  initialScheme,
  initialMode,
}: {
  initialTimezone: string;
  initialScheme: Scheme;
  initialMode: Mode;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [privacy, setPrivacy] = useState(false);
  const [health, setHealth] = useState(false);
  const [community, setCommunity] = useState(true);
  const [profile, setProfile] = useState<ProfileValues>(emptyProfile);
  // Zeitzone des Geräts vorschlagen, wenn sie zuverlässig ermittelbar ist. Das Auswahlfeld wird erst in
  // Schritt 3 gerendert, daher entsteht kein Unterschied zwischen Server- und Client-HTML.
  const [timezone, setTimezone] = useState(() => {
    if (typeof window === "undefined") return initialTimezone;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return detected && timezones().includes(detected) ? detected : initialTimezone;
  });
  const [scheme, setScheme] = useState<Scheme>(initialScheme);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const zones = useMemo(() => timezones(), []);

  function validateProfileStep() {
    const e: Record<string, string> = {};
    const p = profilePayload(profile);
    if (!(p.weightKg >= 30 && p.weightKg <= 300)) e.weightKg = "Bitte ein Gewicht zwischen 30 und 300 kg angeben.";
    if (!(Number.isInteger(p.heightCm) && p.heightCm >= 120 && p.heightCm <= 230)) e.heightCm = "Bitte eine Größe zwischen 120 und 230 cm angeben.";
    if (profile.distributionModel === "CUSTOM" && !(p.customFactor! >= 0.4 && p.customFactor! <= 0.9)) e.customFactor = "Faktor zwischen 0,40 und 0,90.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api("/api/v1/me/onboarding", {
        method: "POST",
        body: {
          profile: profilePayload(profile),
          timezone,
          themeMode: mode,
          colorScheme: scheme,
          acceptPrivacy: privacy,
          acceptHealthData: health,
          communityOptIn: community,
        },
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      if (err.fields) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) flat[k.replace(/^profile\./, "")] = v;
        setErrors(flat);
        if (Object.keys(flat).some((k) => ["weightKg", "heightCm", "customFactor", "distributionModel"].includes(k))) setStep(1);
      }
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="grid grid-cols-3 gap-2" aria-label="Fortschritt">
        {STEPS.map((s, i) => (
          <li key={s.title} aria-current={i === step ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            <span className={cn("text-xs", i === step ? "font-medium text-fg" : "text-fg-muted")}>
              {i + 1}. {s.title}
            </span>
          </li>
        ))}
      </ol>

      {error && <Alert tone="danger">{error}</Alert>}

      {step === 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Wie Pegel mit deinen Daten umgeht</h2>
          <div className="space-y-3 text-sm text-fg-muted">
            <p>
              Pegel speichert deine erfassten Getränke, Profilangaben (Gewicht, Größe, Berechnungsprofil) und Einstellungen auf diesem Server, um dir
              Statistiken und eine <strong className="text-fg">rechnerische Schätzung</strong> des Blutalkohols anzuzeigen. Angaben zum
              Alkoholkonsum können Gesundheitsdaten im Sinne von Art. 9 DSGVO sein – deshalb fragen wir ausdrücklich nach deiner Einwilligung.
            </p>
            <p>
              Deine einzelnen Einträge sind privat. Administratoren sehen Kontodaten und Aktivitätszeitpunkte, aber nicht deine Einträge. Im
              Community-Ranking sehen andere angemeldete Benutzer nur deine Gesamtmenge – die Teilnahme kannst du im letzten Schritt und
              jederzeit später abwählen. Du kannst deine Daten jederzeit exportieren und dein Konto löschen.
            </p>
            <Alert tone="warning" title="Wichtig: Schätzung, keine Messung">
              {t.estimate.disclaimerLong}
            </Alert>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>
                Ich habe die{" "}
                <Link href="/datenschutz" target="_blank" className="text-primary underline">
                  Datenschutzhinweise
                </Link>{" "}
                und die{" "}
                <Link href="/hinweise" target="_blank" className="text-primary underline">
                  Hinweise zum Berechnungsmodell
                </Link>{" "}
                gelesen.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={health} onChange={(e) => setHealth(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>
                Ich willige ein, dass meine Angaben zum Alkoholkonsum und meine Körperdaten zu den genannten Zwecken verarbeitet werden. Die
                Einwilligung kann ich jederzeit durch Löschen meines Kontos widerrufen.
              </span>
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!privacy || !health}>
              {t.common.next}
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Dein Berechnungsprofil</h2>
          <p className="mb-5 text-sm text-fg-muted">
            Gewicht und Verteilungsfaktor bestimmen, wie stark eine Alkoholmenge den Modellwert erhöht (Widmark-Formel c = A / (r × m)). Du kannst die
            Angaben später jederzeit ändern – bereits erfasste Einträge bleiben unverändert.
          </p>
          <ProfileFields value={profile} onChange={setProfile} errors={errors} />
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              {t.common.back}
            </Button>
            <Button onClick={() => validateProfileStep() && setStep(2)}>{t.common.next}</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Zeitzone & Darstellung</h2>
          <p className="mb-5 text-sm text-fg-muted">Die Zeitzone legt fest, wann für dich ein Tag beginnt und endet.</p>
          <div className="flex flex-col gap-6">
            <Field label="Zeitzone" htmlFor="timezone" error={errors.timezone}>
              <Select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </Select>
            </Field>
            <ThemePicker
              scheme={scheme}
              mode={mode}
              onChange={(s, m) => {
                setScheme(s);
                setMode(m);
                applyTheme(s, m);
              }}
            />
            <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border p-3 text-sm">
              <input type="checkbox" checked={community} onChange={(e) => setCommunity(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>
                Am Community-Ranking teilnehmen
                <span className="block text-xs text-fg-muted">
                  Andere angemeldete Benutzer dieser App sehen deinen Anzeigenamen und deine erfasste Gesamtmenge (Gramm reiner Alkohol), keine
                  einzelnen Einträge. Pseudonym oder Abmeldung jederzeit unter „Community“.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              {t.common.back}
            </Button>
            <Button onClick={submit} loading={loading}>
              Einrichtung abschließen
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
