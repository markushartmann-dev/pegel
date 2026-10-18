/**
 * Seed: legt die Standardgetränke an bzw. aktualisiert sie (idempotent).
 * Wird nach `prisma migrate deploy` ausgeführt (Docker-Service "migrate").
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_BEVERAGES } from "../src/lib/default-beverages";
import { alcoholGrams, roundGrams } from "../src/lib/calculations/alcohol";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, options: "-c TimeZone=UTC" }) });

async function main() {
  let created = 0;
  for (const [i, b] of DEFAULT_BEVERAGES.entries()) {
    const existing = await prisma.beverage.findFirst({ where: { ownerId: null, isDefault: true, name: b.name } });
    if (existing) {
      // Bestehende Standardgetränke nicht überschreiben (Admin könnte sie angepasst haben)
      continue;
    }
    await prisma.beverage.create({
      data: {
        name: b.name,
        description: b.description,
        volumeMl: b.volumeMl,
        abv: b.abv,
        alcoholGrams: roundGrams(alcoholGrams(b.volumeMl, b.abv)),
        category: b.category,
        icon: b.icon,
        isDefault: true,
        ownerId: null,
        sortOrder: i,
      },
    });
    created++;
  }
  console.log(`Seed abgeschlossen: ${created} Standardgetränk(e) neu angelegt, ${DEFAULT_BEVERAGES.length - created} bereits vorhanden.`);
}

main()
  .catch((e) => {
    console.error("Seed fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
