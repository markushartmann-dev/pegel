"use client";

import { useEffect } from "react";

/** Registriert den Service Worker (nur in Produktion, um die Entwicklung nicht zu stören). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* z. B. ohne HTTPS (außer localhost) nicht verfügbar */
    });
  }, []);
  return null;
}
