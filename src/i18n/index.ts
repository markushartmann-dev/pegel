import { de, type Dictionary } from "./de";

/**
 * Internationalisierung. Aktuell ist nur Deutsch hinterlegt.
 * Für eine weitere Sprache: `src/i18n/en.ts` mit `export const en: Dictionary = {...}` anlegen,
 * hier in `dictionaries` eintragen und `LOCALE` bzw. eine Benutzereinstellung auswerten.
 */
export const LOCALE = "de-DE";
const dictionaries: Record<string, Dictionary> = { de };

export function getDictionary(lang = "de"): Dictionary {
  return dictionaries[lang] ?? de;
}

export const t = getDictionary();

const numberFormats = new Map<string, Intl.NumberFormat>();
export function formatNumber(value: number, digits = 1): string {
  const key = String(digits);
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    numberFormats.set(key, f);
  }
  return f.format(value);
}

export function formatGrams(value: number): string {
  return `${formatNumber(value, value >= 100 ? 0 : 1)} g`;
}

export function formatPercent(value: number, digits = 0): string {
  return new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: digits, signDisplay: "exceptZero" }).format(value);
}

/** "1 Eintrag" / "3 Einträge" */
export function countLabel(n: number, one: string, many: string): string {
  return `${n.toLocaleString(LOCALE)} ${n === 1 ? one : many}`;
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
}
