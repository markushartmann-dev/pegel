import { describe, expect, it } from "vitest";
import {
  beverageInputSchema,
  communitySchema,
  entryInputSchema,
  fieldErrors,
  notificationSettingsSchema,
  profileInputSchema,
} from "@/lib/validation";
import { canAccessEntry, canEditBeverage, canUseBeverage, checkAdminChange, checkAdminDelete, isAdmin } from "@/lib/permissions";

describe("Getränkevalidierung", () => {
  it("akzeptiert gültige Getränke", () => {
    const r = beverageInputSchema.safeParse({ name: " Helles ", volumeMl: "500", abv: "4.9", category: "BEER" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ name: "Helles", volumeMl: 500, abv: 4.9 });
  });
  it.each([
    [{ name: "X", volumeMl: 500, abv: 5 }, "name"],
    [{ name: "Bier", volumeMl: 0, abv: 5 }, "volumeMl"],
    [{ name: "Bier", volumeMl: 6000, abv: 5 }, "volumeMl"],
    [{ name: "Bier", volumeMl: 330.5, abv: 5 }, "volumeMl"],
    [{ name: "Bier", volumeMl: 500, abv: -1 }, "abv"],
    [{ name: "Bier", volumeMl: 500, abv: 97 }, "abv"],
    [{ name: "Bier", volumeMl: 500, abv: 4.95 }, "abv"],
    [{ name: "Bier", volumeMl: 500, abv: 5, category: "WATER" }, "category"],
  ])("lehnt %j ab", (input, field) => {
    const r = beverageInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error))).toContain(field);
  });
});

describe("Eintragsvalidierung", () => {
  const base = { beverageId: "b1", servings: 1, consumedAtLocal: "2026-10-18T20:00", timezone: "Europe/Berlin" };
  it("gültig", () => expect(entryInputSchema.safeParse(base).success).toBe(true));
  it("zu viele Portionen", () => expect(entryInputSchema.safeParse({ ...base, servings: 21 }).success).toBe(false));
  it("ungültige Zeitzone", () => expect(entryInputSchema.safeParse({ ...base, timezone: "Foo/Bar" }).success).toBe(false));
  it("ungültiges Format", () => expect(entryInputSchema.safeParse({ ...base, consumedAtLocal: "18.10.2026" }).success).toBe(false));
});

describe("Profilvalidierung", () => {
  it("eigener Faktor ist bei CUSTOM Pflicht", () => {
    const r = profileInputSchema.safeParse({ distributionModel: "CUSTOM", weightKg: 80, heightCm: 180 });
    expect(r.success).toBe(false);
  });
  it("Grenzen für Gewicht und Größe", () => {
    expect(profileInputSchema.safeParse({ distributionModel: "WIDMARK_MALE", weightKg: 20, heightCm: 180 }).success).toBe(false);
    expect(profileInputSchema.safeParse({ distributionModel: "WIDMARK_MALE", weightKg: 80, heightCm: 250 }).success).toBe(false);
    expect(profileInputSchema.safeParse({ distributionModel: "WIDMARK_MALE", weightKg: 80.5, heightCm: 180 }).success).toBe(true);
  });
});

describe("Community und Benachrichtigungen", () => {
  it("Pseudonym erforderlich bei Pseudonym-Anzeige", () => {
    expect(communitySchema.safeParse({ optIn: true, display: "PSEUDONYM" }).success).toBe(false);
    expect(communitySchema.safeParse({ optIn: true, display: "PSEUDONYM", pseudonym: "Hopfen" }).success).toBe(true);
    expect(communitySchema.safeParse({ optIn: false }).success).toBe(true);
  });
  it("Uhrzeit-Format", () => {
    expect(notificationSettingsSchema.safeParse({ reminderTime: "21:00" }).success).toBe(true);
    expect(notificationSettingsSchema.safeParse({ reminderTime: "25:00" }).success).toBe(false);
  });
});

describe("Berechtigungen", () => {
  const user = { id: "u1", role: "USER" as const };
  const other = { id: "u2", role: "USER" as const };
  const admin = { id: "a1", role: "ADMIN" as const, status: "ACTIVE" as const };

  it("Getränke", () => {
    const own = { ownerId: "u1", isDefault: false };
    const global = { ownerId: null, isDefault: true };
    expect(canEditBeverage(user, own)).toBe(true);
    expect(canEditBeverage(other, own)).toBe(false);
    expect(canEditBeverage(user, global)).toBe(false);
    expect(canEditBeverage(admin, global)).toBe(true);
    expect(canUseBeverage(user, global)).toBe(true);
    expect(canUseBeverage(other, own)).toBe(false);
  });

  it("Einträge sind privat – auch für Administratoren", () => {
    expect(canAccessEntry(user, { userId: "u1" })).toBe(true);
    expect(canAccessEntry(other, { userId: "u1" })).toBe(false);
    expect(canAccessEntry(admin, { userId: "u1" })).toBe(false);
  });

  it("deaktivierte Administratoren haben keine Rechte", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin({ ...admin, status: "DEACTIVATED" })).toBe(false);
    expect(isAdmin(user)).toBe(false);
  });

  it("letzter Administrator ist geschützt", () => {
    const target = { id: "a1", role: "ADMIN" as const, status: "ACTIVE" as const };
    expect(checkAdminChange(admin, target, { role: "USER" }, 1).ok).toBe(false);
    expect(checkAdminChange(admin, { ...target, id: "a2" }, { role: "USER" }, 2).ok).toBe(true);
    expect(checkAdminChange(admin, { ...target, id: "a2" }, { status: "DEACTIVATED" }, 1).ok).toBe(false);
    expect(checkAdminChange(admin, target, { status: "DEACTIVATED" }, 3).ok).toBe(false); // sich selbst
    expect(checkAdminChange(user, target, { role: "USER" }, 3).ok).toBe(false);
    expect(checkAdminDelete(admin, target, 1).ok).toBe(false);
    expect(checkAdminDelete(admin, { id: "u9", role: "USER", status: "ACTIVE" }, 1).ok).toBe(true);
  });
});
