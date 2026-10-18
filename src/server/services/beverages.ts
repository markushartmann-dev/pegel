import "server-only";
import { prisma } from "../db";
import { audit } from "../audit";
import { conflict, forbidden, notFound } from "../errors";
import { alcoholGrams, roundGrams } from "@/lib/calculations/alcohol";
import { canEditBeverage } from "@/lib/permissions";
import { beverageInputSchema, beverageUpdateSchema } from "@/lib/validation";
import type { CurrentUser } from "../current-user";
import { Prisma } from "@/generated/prisma/client";

export interface BeverageDTO {
  id: string;
  name: string;
  description: string | null;
  volumeMl: number;
  abv: number;
  alcoholGrams: number;
  category: string;
  icon: string | null;
  isDefault: boolean;
  isActive: boolean;
  isFavorite: boolean;
  own: boolean;
}

type BeverageRow = Prisma.BeverageGetPayload<object>;

export function toBeverageDTO(b: BeverageRow, userId: string): BeverageDTO {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    volumeMl: b.volumeMl,
    abv: Number(b.abv),
    alcoholGrams: Number(b.alcoholGrams),
    category: b.category,
    icon: b.icon,
    isDefault: b.isDefault,
    isActive: b.isActive,
    isFavorite: b.isFavorite,
    own: b.ownerId === userId,
  };
}

/** Standardgetränke + eigene Getränke des Benutzers. */
export async function listBeverages(userId: string, opts: { includeArchived?: boolean } = {}) {
  const rows = await prisma.beverage.findMany({
    where: {
      OR: [{ ownerId: null, isDefault: true }, { ownerId: userId }],
      ...(opts.includeArchived ? {} : { isActive: true }),
    },
    orderBy: [{ isDefault: "desc" }, { isFavorite: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((b) => toBeverageDTO(b, userId));
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createBeverage(user: CurrentUser, raw: unknown, headers?: Headers) {
  const input = beverageInputSchema.parse(raw);
  const grams = roundGrams(alcoholGrams(input.volumeMl, input.abv));
  try {
    const b = await prisma.beverage.create({
      data: {
        name: input.name,
        description: input.description || null,
        volumeMl: input.volumeMl,
        abv: input.abv,
        alcoholGrams: grams,
        category: input.category,
        isFavorite: input.isFavorite ?? true,
        ownerId: user.id,
      },
    });
    await audit({ action: "beverage.created", actorId: user.id, entityType: "beverage", entityId: b.id, headers });
    return toBeverageDTO(b, user.id);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict("Du hast bereits ein Getränk mit diesem Namen (ggf. archiviert).");
    throw e;
  }
}

async function loadEditable(user: CurrentUser, id: string) {
  const b = await prisma.beverage.findUnique({ where: { id } });
  // Fremde Getränke werden wie nicht existierende behandelt (kein Informationsleck).
  if (!b || (b.ownerId !== null && b.ownerId !== user.id)) throw notFound("Getränk nicht gefunden.");
  if (!canEditBeverage(user, b)) throw forbidden("Standardgetränke können nur von der Administration geändert werden.");
  return b;
}

export async function updateBeverage(user: CurrentUser, id: string, raw: unknown, headers?: Headers) {
  const input = beverageUpdateSchema.parse(raw);
  const b = await loadEditable(user, id);
  const volumeMl = input.volumeMl ?? b.volumeMl;
  const abv = input.abv ?? Number(b.abv);
  try {
    const updated = await prisma.beverage.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description === undefined ? undefined : input.description || null,
        category: input.category ?? undefined,
        isFavorite: input.isFavorite ?? undefined,
        isActive: input.isActive ?? undefined,
        volumeMl,
        abv,
        alcoholGrams: roundGrams(alcoholGrams(volumeMl, abv)),
      },
    });
    const action =
      input.isActive === false ? "beverage.archived" : input.isActive === true && !b.isActive ? "beverage.restored" : "beverage.updated";
    await audit({
      action: b.isDefault ? "admin.default_beverage_changed" : action,
      actorId: user.id,
      entityType: "beverage",
      entityId: id,
      headers,
      metadata: { fields: Object.keys(input) },
    });
    return toBeverageDTO(updated, user.id);
  } catch (e) {
    if (isUniqueViolation(e)) throw conflict("Ein Getränk mit diesem Namen existiert bereits.");
    throw e;
  }
}

/**
 * Getränke werden nur archiviert (nicht gelöscht), damit historische Einträge
 * ihre Referenz behalten. Die Einträge selbst enthalten ohnehin einen Snapshot.
 */
export async function archiveBeverage(user: CurrentUser, id: string, headers?: Headers) {
  return updateBeverage(user, id, { isActive: false }, headers);
}
