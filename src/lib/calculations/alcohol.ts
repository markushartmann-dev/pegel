/**
 * Berechnung der Masse reinen Alkohols.
 *
 *   A [g] = Volumen [ml] × Alkoholgehalt [% vol] / 100 × 0,789 g/ml
 *
 * 0,789 g/ml ist die Dichte von Ethanol bei 20 °C. Werte werden ungerundet
 * zurückgegeben; gerundet wird erst bei der Darstellung bzw. Speicherung (2 Nachkommastellen).
 */
export const ETHANOL_DENSITY_G_PER_ML = 0.789;

export const LIMITS = {
  volumeMl: { min: 1, max: 5000 },
  abv: { min: 0, max: 96 },
  servings: { min: 1, max: 20 },
} as const;

export class CalculationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationInputError";
  }
}

function assertFiniteNonNegative(value: number, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CalculationInputError(`${label} muss eine endliche Zahl sein.`);
  }
  if (value < 0) throw new CalculationInputError(`${label} darf nicht negativ sein.`);
}

/** Gramm reinen Alkohols für eine Portion. */
export function alcoholGrams(volumeMl: number, abvPercent: number): number {
  assertFiniteNonNegative(volumeMl, "Volumen");
  assertFiniteNonNegative(abvPercent, "Alkoholgehalt");
  if (abvPercent > 100) throw new CalculationInputError("Alkoholgehalt darf 100 % nicht übersteigen.");
  return volumeMl * (abvPercent / 100) * ETHANOL_DENSITY_G_PER_ML;
}

/** Gramm reinen Alkohols für mehrere Portionen. */
export function totalAlcoholGrams(volumeMl: number, abvPercent: number, servings: number): number {
  if (!Number.isInteger(servings) || servings < 1) {
    throw new CalculationInputError("Anzahl der Portionen muss eine ganze Zahl ≥ 1 sein.");
  }
  return alcoholGrams(volumeMl, abvPercent) * servings;
}

/** Rundung für die Speicherung (Decimal(7,2)). */
export function roundGrams(grams: number): number {
  return Math.round(grams * 100) / 100;
}
