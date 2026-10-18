import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveSession, touchActivity, type CurrentUser } from "./current-user";

/**
 * Sitzungsprüfung für Server Components (Seiten und Layouts).
 * Pro Request nur einmal ausgeführt (React cache).
 */
export const getPageUser = cache(async (): Promise<CurrentUser | null> => {
  const resolved = await resolveSession(await headers());
  return resolved?.user ?? null;
});

/** Angemeldeter Benutzer, sonst Weiterleitung zur Anmeldung. Ein Seitenaufruf zählt als Aktivität. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getPageUser();
  if (!user) redirect("/anmelden");
  await touchActivity(user);
  return user;
}

/** Wie requireUser, zusätzlich Weiterleitung zum Onboarding, solange Profilangaben fehlen. */
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.onboardingCompleted) redirect("/onboarding");
  return user;
}

/** Nur für Administratoren. Andere Benutzer erhalten eine 404-Seite (kein Hinweis auf den Bereich). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireOnboardedUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}
