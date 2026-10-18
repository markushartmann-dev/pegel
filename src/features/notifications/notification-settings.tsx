"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BellOff, BellRing, Send, Smartphone } from "lucide-react";
import { Alert, Badge, Button, Card, CardHeader, Field, Input } from "@/components/ui";
import { useToast } from "@/components/ui/client";
import { api, ApiError } from "@/lib/api-client";

type Settings = { notificationsEnabled: boolean; reminderEnabled: boolean; reminderTime: string; weeklySummaryEnabled: boolean; subscriptions: number };

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Support = { supported: boolean; ios: boolean; standalone: boolean; secure: boolean; permission: NotificationPermission | "unsupported" };

function detectSupport(): Support {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { supported, ios, standalone, secure: window.isSecureContext, permission: "Notification" in window ? Notification.permission : "unsupported" };
}

let supportCache: Support | null = null;
const getSupportSnapshot = () => (supportCache ??= detectSupport());
const noopSubscribe = () => () => {};

export function NotificationSettings({ initial, config, timezone }: { initial: Settings; config: { enabled: boolean; publicKey: string | null }; timezone: string }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initial);
  // Browser-Fähigkeiten erst nach dem Hydrieren ermitteln (auf dem Server unbekannt)
  const detected = useSyncExternalStore(noopSubscribe, getSupportSnapshot, () => null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const support = detected && permission ? { ...detected, permission } : detected;
  const [deviceSubscribed, setDeviceSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!detected?.supported) return;
    let active = true;
    navigator.serviceWorker.getRegistration("/").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      if (active) setDeviceSubscribed(!!sub);
    });
    return () => {
      active = false;
    };
  }, [detected]);

  async function enableDevice() {
    if (!config.publicKey) return;
    setBusy("enable");
    setError(null);
    try {
      // Die Berechtigung wird nur nach bewusster Benutzeraktion (Klick) angefragt.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") throw new Error("Benachrichtigungen wurden im Browser nicht erlaubt.");
      const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) });
      await api("/api/v1/notifications/subscription", { method: "POST", body: sub.toJSON() });
      setDeviceSubscribed(true);
      setS((x) => ({ ...x, notificationsEnabled: true, subscriptions: x.subscriptions + 1 }));
      toast("Push-Benachrichtigungen auf diesem Gerät aktiviert.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function disableDevice() {
    setBusy("disable");
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      await api("/api/v1/notifications/subscription", { method: "DELETE", body: { endpoint: sub?.endpoint ?? null } });
      await sub?.unsubscribe();
      setDeviceSubscribed(false);
      toast("Push-Benachrichtigungen auf diesem Gerät deaktiviert.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function disableAll() {
    setBusy("all");
    try {
      await api("/api/v1/notifications/subscription", { method: "DELETE", body: {} });
      const reg = await navigator.serviceWorker?.getRegistration("/");
      await (await reg?.pushManager.getSubscription())?.unsubscribe();
      setDeviceSubscribed(false);
      setS((x) => ({ ...x, notificationsEnabled: false, subscriptions: 0 }));
      toast("Alle Geräte abgemeldet.");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy("test");
    try {
      const r = await api<{ result: { delivered: number; failed: number } | null }>("/api/v1/notifications/test", { method: "POST" });
      if (r.result && r.result.delivered > 0) toast(`Testnachricht an ${r.result.delivered} Gerät(e) gesendet.`);
      else toast("Die Testnachricht konnte nicht zugestellt werden. Bitte Gerät erneut aktivieren.", "error");
    } catch (e) {
      toast((e as ApiError).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setBusy("prefs");
    try {
      const r = await api<{ settings: Settings }>("/api/v1/notifications", {
        method: "PATCH",
        body: { reminderEnabled: s.reminderEnabled, reminderTime: s.reminderTime, weeklySummaryEnabled: s.weeklySummaryEnabled },
      });
      setS(r.settings);
      toast("Einstellungen gespeichert.");
    } catch (err) {
      toast((err as ApiError).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Push auf diesem Gerät" icon={<Smartphone className="size-5" />} description="Standardmäßig aus. Benachrichtigungen enthalten keine Mengen oder Promillewerte." />
        {!config.enabled ? (
          <Alert tone="info" title="Auf diesem Server nicht eingerichtet">
            Für Push-Benachrichtigungen muss die Administration VAPID-Schlüssel konfigurieren (siehe README). Alle anderen Funktionen sind davon unabhängig.
          </Alert>
        ) : !support ? null : !support.secure ? (
          <Alert tone="warning" title="HTTPS erforderlich">
            Browser erlauben Push-Benachrichtigungen nur über HTTPS (oder localhost).
          </Alert>
        ) : support.ios && !support.standalone ? (
          <Alert tone="info" title="iPhone/iPad: zuerst zum Home-Bildschirm hinzufügen">
            Unter iOS/iPadOS ab Version 16.4 funktionieren Web-Push-Benachrichtigungen nur in der installierten Web-App. Tippe in Safari auf „Teilen“ →
            „Zum Home-Bildschirm“ und öffne Pegel von dort.
          </Alert>
        ) : !support.supported ? (
          <Alert tone="warning">Dieser Browser unterstützt keine Web-Push-Benachrichtigungen.</Alert>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Status:
              {deviceSubscribed ? <Badge tone="success">aktiv</Badge> : <Badge>inaktiv</Badge>}
              {support.permission === "denied" && <Badge tone="danger">im Browser blockiert</Badge>}
              <span className="text-fg-muted">· {s.subscriptions} Gerät(e) registriert</span>
            </div>
            {support.permission === "denied" && (
              <Alert tone="warning">Benachrichtigungen sind in den Browser-Einstellungen für diese Seite blockiert. Bitte dort erlauben.</Alert>
            )}
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex flex-wrap gap-2">
              {deviceSubscribed ? (
                <Button variant="outline" onClick={disableDevice} loading={busy === "disable"}>
                  <BellOff className="size-4" aria-hidden /> Auf diesem Gerät deaktivieren
                </Button>
              ) : (
                <Button onClick={enableDevice} loading={busy === "enable"} disabled={support.permission === "denied"}>
                  <BellRing className="size-4" aria-hidden /> Aktivieren
                </Button>
              )}
              <Button variant="outline" onClick={sendTest} loading={busy === "test"} disabled={s.subscriptions === 0}>
                <Send className="size-4" aria-hidden /> Testnachricht
              </Button>
            </div>
          </div>
        )}
        {s.subscriptions > 0 && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={disableAll} loading={busy === "all"}>
            Alle Geräte abmelden
          </Button>
        )}
      </Card>

      <Card>
        <CardHeader title="Erinnerungen" description={`Werden nur gesendet, wenn Push aktiv ist. Uhrzeiten in ${timezone}.`} />
        <form onSubmit={savePrefs} className="flex flex-col gap-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={s.reminderEnabled} onChange={(e) => setS({ ...s, reminderEnabled: e.target.checked })} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              Tägliche Erinnerung zum Eintragen
              <span className="block text-xs text-fg-muted">„Möchtest du deine Einträge für heute ergänzen?“</span>
            </span>
          </label>
          {s.reminderEnabled && (
            <Field label="Uhrzeit" htmlFor="reminderTime">
              <Input id="reminderTime" type="time" value={s.reminderTime} onChange={(e) => setS({ ...s, reminderTime: e.target.value })} className="w-36" />
            </Field>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={s.weeklySummaryEnabled} onChange={(e) => setS({ ...s, weeklySummaryEnabled: e.target.checked })} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              Wochenübersicht (montags ab 10 Uhr)
              <span className="block text-xs text-fg-muted">Nur ein Hinweis – die Zahlen siehst du erst nach dem Öffnen der App.</span>
            </span>
          </label>
          <div className="flex justify-end">
            <Button type="submit" loading={busy === "prefs"}>
              Speichern
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
