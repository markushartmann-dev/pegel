/*
 * Pegel – Service Worker
 *
 * Strategie:
 *  - Statische Build-Assets (/_next/static, /icons) werden "cache first" vorgehalten.
 *  - Seiten werden immer vom Netz geladen; ohne Verbindung erscheint /offline.html.
 *  - /api/* und alle anderen Antworten mit privaten Daten werden NIE zwischengespeichert.
 *  - Push-Benachrichtigungen werden angezeigt; ein Klick öffnet die angegebene Seite.
 */
const VERSION = "pegel-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/icons/icon.svg", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // private Daten: Netzwerk, kein Cache

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match("/offline.html")) || new Response("Offline", { status: 503 })),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Pegel", body: "Neue Benachrichtigung", url: "/dashboard", tag: "pegel" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ungültige Nutzlast ignorieren */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(target.href);
          return w.focus();
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});

self.addEventListener("pushsubscriptionchange", () => {
  // Der Browser hat das Abo erneuert/entzogen. Die App registriert beim nächsten Öffnen der
  // Einstellungen neu; abgelaufene Abos entfernt der Server beim nächsten Versand (HTTP 404/410).
});
