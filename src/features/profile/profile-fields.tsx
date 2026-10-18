"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { t } from "@/i18n";
import { distributionFactor, type DistributionModel } from "@/lib/calculations/widmark";

export interface ProfileValues {
  gender: string;
  distributionModel: DistributionModel;
  customFactor: string;
  weightKg: string;
  heightCm: string;
}

export const emptyProfile: ProfileValues = {
  gender: "UNSPECIFIED",
  distributionModel: "WIDMARK_MALE",
  customFactor: "0.6",
  weightKg: "",
  heightCm: "",
};

export function profilePayload(v: ProfileValues) {
  return {
    gender: v.gender,
    distributionModel: v.distributionModel,
    customFactor: v.distributionModel === "CUSTOM" ? Number(v.customFactor.replace(",", ".")) : null,
    weightKg: Number(v.weightKg.replace(",", ".")),
    heightCm: Number(v.heightCm),
  };
}

/** Vorschau des Verteilungsfaktors (identische Berechnung wie auf dem Server). */
function previewFactor(v: ProfileValues): string | null {
  try {
    const p = profilePayload(v);
    return distributionFactor({ ...p, distributionModel: v.distributionModel }).toLocaleString("de-DE", { maximumFractionDigits: 3 });
  } catch {
    return null;
  }
}

export function ProfileFields({
  value,
  onChange,
  errors = {},
}: {
  value: ProfileValues;
  onChange: (v: ProfileValues) => void;
  errors?: Record<string, string>;
}) {
  const set = (k: keyof ProfileValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const factor = previewFactor(value);
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Geschlecht" htmlFor="gender" hint="Freiwillig. Wird nicht für die Berechnung verwendet." error={errors.gender}>
        <Select id="gender" value={value.gender} onChange={set("gender")}>
          {Object.entries(t.gender).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Berechnungsprofil"
        htmlFor="distributionModel"
        error={errors.distributionModel}
        hint={
          <button type="button" className="underline underline-offset-2" onClick={() => setShowInfo((s) => !s)} aria-expanded={showInfo}>
            Was bedeutet das?
          </button>
        }
      >
        <Select id="distributionModel" value={value.distributionModel} onChange={set("distributionModel")}>
          {Object.entries(t.distribution).map(([k, d]) => (
            <option key={k} value={k}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>
      {showInfo && (
        <div className="rounded-[var(--radius-sm)] bg-muted p-3 text-sm text-fg-muted sm:col-span-2">
          Der <strong className="text-fg">Verteilungsfaktor r</strong> beschreibt, wie sich Alkohol im Körperwasser verteilt. Er hängt vor allem vom
          Körperwasseranteil ab und ist individuell sehr unterschiedlich. Das physiologische Berechnungsprofil ist daher nicht dasselbe wie das
          Geschlecht: Wähle das Profil, das deiner Körperzusammensetzung am nächsten kommt. Die Seidl-Formeln berücksichtigen zusätzlich Größe und
          Gewicht. Mit einem eigenen Faktor (0,40–0,90) kannst du z. B. einen ärztlich ermittelten Wert verwenden.
        </div>
      )}
      {value.distributionModel === "CUSTOM" && (
        <Field label="Eigener Verteilungsfaktor r" htmlFor="customFactor" hint="Zwischen 0,40 und 0,90" error={errors["customFactor"] ?? errors["profile.customFactor"]}>
          <Input id="customFactor" inputMode="decimal" value={value.customFactor} onChange={set("customFactor")} />
        </Field>
      )}
      <Field label="Körpergewicht (kg)" htmlFor="weightKg" error={errors.weightKg ?? errors["profile.weightKg"]}>
        <Input id="weightKg" inputMode="decimal" value={value.weightKg} onChange={set("weightKg")} placeholder="z. B. 75" required aria-invalid={!!errors.weightKg} />
      </Field>
      <Field
        label="Körpergröße (cm)"
        htmlFor="heightCm"
        error={errors.heightCm ?? errors["profile.heightCm"]}
        hint="Wird für die Seidl-Formel verwendet; in die klassische Widmark-Formel geht sie nicht ein."
      >
        <Input id="heightCm" inputMode="numeric" value={value.heightCm} onChange={set("heightCm")} placeholder="z. B. 178" required aria-invalid={!!errors.heightCm} />
      </Field>
      <div className="sm:col-span-2 text-sm text-fg-muted">
        Verwendeter Verteilungsfaktor: <span className="font-medium text-fg tabular">{factor ?? "–"}</span>
      </div>
    </div>
  );
}
