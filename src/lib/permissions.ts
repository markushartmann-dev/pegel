/**
 * Reine Berechtigungslogik (ohne Datenbankzugriff). Die Route Handlers und Services
 * rufen diese Funktionen auf, nachdem sie die betroffenen Datensätze geladen haben.
 */
export type Role = "USER" | "ADMIN";

export interface Actor {
  id: string;
  role: Role;
  status?: "ACTIVE" | "DEACTIVATED";
}

export function isAdmin(actor: Actor | null | undefined): boolean {
  return !!actor && actor.role === "ADMIN" && actor.status !== "DEACTIVATED";
}

/** Eigene Getränke darf nur der Besitzer ändern; Standardgetränke nur Administratoren. */
export function canEditBeverage(actor: Actor, beverage: { ownerId: string | null; isDefault: boolean }): boolean {
  if (beverage.isDefault || beverage.ownerId === null) return isAdmin(actor);
  return beverage.ownerId === actor.id;
}

/** Ein Getränk darf benutzt werden, wenn es global oder eigenes ist. */
export function canUseBeverage(actor: Actor, beverage: { ownerId: string | null; isDefault: boolean }): boolean {
  return beverage.ownerId === null || beverage.ownerId === actor.id;
}

/** Konsumeinträge sind strikt privat – auch Administratoren ändern keine fremden Einträge. */
export function canAccessEntry(actor: Actor, entry: { userId: string }): boolean {
  return entry.userId === actor.id;
}

export type RoleChangeCheck = { ok: true } | { ok: false; reason: string };

/**
 * Schutz vor dem Verlust des letzten Administrators:
 *  - Der letzte aktive Administrator darf weder herabgestuft noch deaktiviert werden.
 */
export function checkAdminChange(
  actor: Actor,
  target: { id: string; role: Role; status: "ACTIVE" | "DEACTIVATED" },
  change: { role?: Role; status?: "ACTIVE" | "DEACTIVATED" },
  activeAdminCount: number,
): RoleChangeCheck {
  if (!isAdmin(actor)) return { ok: false, reason: "Keine Berechtigung." };
  const targetIsActiveAdmin = target.role === "ADMIN" && target.status === "ACTIVE";
  const losesAdmin =
    targetIsActiveAdmin && ((change.role && change.role !== "ADMIN") || change.status === "DEACTIVATED");
  if (losesAdmin && activeAdminCount <= 1) {
    return { ok: false, reason: "Der letzte aktive Administrator kann nicht herabgestuft oder deaktiviert werden." };
  }
  if (target.id === actor.id && change.status === "DEACTIVATED") {
    return { ok: false, reason: "Das eigene Konto kann nicht deaktiviert werden." };
  }
  return { ok: true };
}

export function checkAdminDelete(actor: Actor, target: { id: string; role: Role; status: string }, activeAdminCount: number): RoleChangeCheck {
  if (!isAdmin(actor)) return { ok: false, reason: "Keine Berechtigung." };
  if (target.role === "ADMIN" && target.status === "ACTIVE" && activeAdminCount <= 1) {
    return { ok: false, reason: "Der letzte aktive Administrator kann nicht gelöscht werden." };
  }
  return { ok: true };
}
