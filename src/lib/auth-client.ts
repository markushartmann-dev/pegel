"use client";

import { createAuthClient } from "better-auth/react";

/** Client für die Better-Auth-Endpunkte unter /api/auth (gleiche Origin, Cookies HttpOnly). */
export const authClient = createAuthClient();

/** Übersetzt typische Fehlermeldungen von Better Auth ins Deutsche. */
export function authErrorMessage(error: { message?: string; code?: string; status?: number } | null | undefined): string {
  if (!error) return "Unbekannter Fehler.";
  const code = error.code ?? "";
  const map: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "E-Mail-Adresse oder Passwort ist falsch.",
    USER_ALREADY_EXISTS: "Mit dieser E-Mail-Adresse besteht bereits ein Konto.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Mit dieser E-Mail-Adresse besteht bereits ein Konto.",
    PASSWORD_TOO_SHORT: "Das Passwort muss mindestens 10 Zeichen lang sein.",
    PASSWORD_TOO_LONG: "Das Passwort ist zu lang.",
    INVALID_EMAIL: "Bitte eine gültige E-Mail-Adresse eingeben.",
    EMAIL_NOT_VERIFIED: "Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail).",
    INVALID_TOKEN: "Der Link ist ungültig oder abgelaufen.",
    INVALID_PASSWORD: "Das aktuelle Passwort ist falsch.",
  };
  if (map[code]) return map[code];
  if (error.status === 429) return error.message && /[äöüß]|Bitte/.test(error.message) ? error.message : "Zu viele Versuche. Bitte warte einen Moment.";
  if (error.status === 403 && error.message) return error.message;
  return error.message && /[äöüß]|Bitte|Dieses|Die /.test(error.message) ? error.message : "Die Anfrage konnte nicht verarbeitet werden.";
}
