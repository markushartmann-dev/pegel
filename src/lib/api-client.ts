"use client";

/**
 * Schlanker Fetch-Wrapper für die eigenen /api/v1-Endpunkte.
 * Cookies werden automatisch mitgesendet (same-origin); Tokens liegen nie im localStorage.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.", 0, "NETWORK");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; fields?: Record<string, string> };
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      // Vollständiges Neuladen gewollt: abgelaufene Sitzung, Client-Zustand verwerfen
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/anmelden?weiter=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(data.error ?? "Unbekannter Fehler.", res.status, data.code, data.fields);
  }
  return data as T;
}
