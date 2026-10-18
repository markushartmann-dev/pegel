/**
 * Standardgetränke, die beim Initialisieren der Datenbank angelegt werden.
 * Die Alkoholgehalte sind typische Startwerte, keine universellen Werte –
 * für genaue Angaben sollten Benutzer eigene Getränke mit dem Wert vom Etikett anlegen.
 */
export interface DefaultBeverage {
  name: string;
  description: string;
  volumeMl: number;
  abv: number;
  category: "BEER" | "WINE" | "SPARKLING" | "SPIRITS" | "MIXED" | "CIDER" | "OTHER";
  icon: string;
}

export const DEFAULT_BEVERAGES: readonly DefaultBeverage[] = [
  { name: "Bier klein", description: "Typisches Lager/Pils, 0,2 l", volumeMl: 200, abv: 5.0, category: "BEER", icon: "beer" },
  { name: "Bier 0,33 l", description: "Flasche Lager/Pils", volumeMl: 330, abv: 5.0, category: "BEER", icon: "beer" },
  { name: "Bier 0,5 l", description: "Lager/Pils, Halbe", volumeMl: 500, abv: 5.0, category: "BEER", icon: "beer" },
  { name: "Sekt", description: "Glas Sekt, 0,1 l", volumeMl: 100, abv: 11.0, category: "SPARKLING", icon: "wine" },
  { name: "Radler 0,5 l", description: "Bier mit Limonade (ca. 50/50)", volumeMl: 500, abv: 2.5, category: "MIXED", icon: "citrus" },
  { name: "Weizen 0,5 l", description: "Weißbier", volumeMl: 500, abv: 5.4, category: "BEER", icon: "beer" },
  { name: "Wein 0,2 l", description: "Rot- oder Weißwein", volumeMl: 200, abv: 12.0, category: "WINE", icon: "wine" },
  { name: "Schnaps 2 cl", description: "Spirituose mit 40 % vol", volumeMl: 20, abv: 40.0, category: "SPIRITS", icon: "glass-water" },
  // 75 ml Prosecco (11 %) + 50 ml Aperol (11 %) + 25 ml Soda = 150 ml mit ca. 9,2 % vol (ohne Eis)
  { name: "Aperol Spritz", description: "3 Teile Prosecco, 2 Teile Aperol, Schuss Soda", volumeMl: 150, abv: 9.2, category: "MIXED", icon: "citrus" },
];
