"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/components/ui";
import { t } from "@/i18n";

export const SCHEMES = ["MIDNIGHT", "OCEAN", "FOREST", "SUNSET", "LIGHT"] as const;
export const MODES = ["SYSTEM", "LIGHT", "DARK"] as const;
export type Scheme = (typeof SCHEMES)[number];
export type Mode = (typeof MODES)[number];

/** Wendet die Auswahl sofort an (Vorschau); gespeichert wird serverseitig beim Absenden. */
export function applyTheme(scheme: Scheme, mode: Mode) {
  document.documentElement.dataset.scheme = scheme.toLowerCase();
  document.documentElement.dataset.mode = mode.toLowerCase();
}

const swatches: Record<Scheme, [string, string, string]> = {
  MIDNIGHT: ["#0d1014", "#151a20", "#22d3ee"],
  OCEAN: ["#08131f", "#0e1f31", "#38bdf8"],
  FOREST: ["#0b130e", "#121e16", "#4ade80"],
  SUNSET: ["#160c1a", "#211327", "#fb923c"],
  LIGHT: ["#fafafa", "#ffffff", "#4338ca"],
};

export function ThemePicker({
  scheme,
  mode,
  onChange,
}: {
  scheme: Scheme;
  mode: Mode;
  onChange: (scheme: Scheme, mode: Mode) => void;
}) {
  const icons = { SYSTEM: Monitor, LIGHT: Sun, DARK: Moon };
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Helligkeit</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {MODES.map((m) => {
            const Icon = icons[m];
            return (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                  mode === m ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary" : "border-border hover:bg-muted",
                )}
              >
                <input type="radio" name="themeMode" value={m} checked={mode === m} onChange={() => onChange(scheme, m)} className="sr-only" />
                <Icon className="size-4" aria-hidden />
                {t.modes[m]}
              </label>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Farbschema</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup">
          {SCHEMES.map((s) => {
            const [bg, card, accent] = swatches[s];
            return (
              <label
                key={s}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-2 rounded-[var(--radius-sm)] border p-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                  scheme === s ? "border-primary" : "border-border hover:bg-muted",
                )}
              >
                <input type="radio" name="colorScheme" value={s} checked={scheme === s} onChange={() => onChange(s, mode)} className="sr-only" />
                <span className="flex h-10 overflow-hidden rounded-md border border-border" aria-hidden>
                  <span className="flex-1" style={{ background: bg }} />
                  <span className="flex-1" style={{ background: card }} />
                  <span className="w-4" style={{ background: accent }} />
                </span>
                <span className="font-medium">{t.themes[s].label}</span>
                <span className="text-xs text-fg-muted">{t.themes[s].hint}</span>
                {scheme === s && <Check className="absolute right-2 top-2 size-4 text-primary" aria-hidden />}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
