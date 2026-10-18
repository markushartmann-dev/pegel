import { describe, expect, it } from "vitest";
import { alcoholGrams, CalculationInputError, roundGrams, totalAlcoholGrams } from "@/lib/calculations/alcohol";
import { DEFAULT_BEVERAGES } from "@/lib/default-beverages";

describe("alcoholGrams", () => {
  it("berechnet 0,5 l Bier mit 5 % vol ≈ 19,7 g", () => {
    expect(alcoholGrams(500, 5)).toBeCloseTo(19.725, 6);
    expect(roundGrams(alcoholGrams(500, 5))).toBe(19.73);
  });

  it.each([
    ["Bier klein", 200, 5, 7.89],
    ["Bier 0,33 l", 330, 5, 13.0185],
    ["Bier 0,5 l", 500, 5, 19.725],
    ["Sekt", 100, 11, 8.679],
    ["Radler 0,5 l", 500, 2.5, 9.8625],
  ])("Standardgetränk %s", (name, ml, abv, expected) => {
    const def = DEFAULT_BEVERAGES.find((b) => b.name === name);
    expect(def, `Standardgetränk ${name} fehlt`).toBeDefined();
    expect(def!.volumeMl).toBe(ml);
    expect(def!.abv).toBe(abv);
    expect(alcoholGrams(def!.volumeMl, def!.abv)).toBeCloseTo(expected, 6);
  });

  it("alle Standardgetränke liefern plausible Werte", () => {
    for (const b of DEFAULT_BEVERAGES) {
      const g = alcoholGrams(b.volumeMl, b.abv);
      expect(g).toBeGreaterThan(0);
      expect(g).toBeLessThan(100);
    }
  });

  it("liefert 0 g bei alkoholfreien Getränken oder 0 ml", () => {
    expect(alcoholGrams(500, 0)).toBe(0);
    expect(alcoholGrams(0, 5)).toBe(0);
  });

  it("lehnt ungültige Eingaben ab", () => {
    expect(() => alcoholGrams(-1, 5)).toThrow(CalculationInputError);
    expect(() => alcoholGrams(500, -5)).toThrow(CalculationInputError);
    expect(() => alcoholGrams(500, 101)).toThrow(CalculationInputError);
    expect(() => alcoholGrams(Number.NaN, 5)).toThrow(CalculationInputError);
    expect(() => alcoholGrams(Infinity, 5)).toThrow(CalculationInputError);
  });

  it("multipliziert Portionen", () => {
    expect(totalAlcoholGrams(500, 5, 3)).toBeCloseTo(59.175, 6);
    expect(() => totalAlcoholGrams(500, 5, 0)).toThrow(CalculationInputError);
    expect(() => totalAlcoholGrams(500, 5, 1.5)).toThrow(CalculationInputError);
  });

  it("rundet auf zwei Nachkommastellen", () => {
    expect(roundGrams(8.679)).toBe(8.68);
    expect(roundGrams(13.0185)).toBe(13.02);
    expect(roundGrams(0)).toBe(0);
  });
});
