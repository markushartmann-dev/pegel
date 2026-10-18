import { expect, test } from "@playwright/test";
import { completeOnboarding, login, logDrink, logout, PASSWORD, register, signupComplete, uniqueEmail } from "./helpers";

/**
 * Ende-zu-Ende-Abläufe. Die Tests laufen nacheinander gegen eine frische Datenbank;
 * der erste registrierte Benutzer wird Administrator.
 */
test.describe.configure({ mode: "serial" });

const admin = { name: "Ada Admin", email: uniqueEmail("admin") };
const anna = { name: "Anna", email: uniqueEmail("anna") };

test("1. Registrierung, Anmeldung und Profil vervollständigen (Onboarding ist Pflicht)", async ({ page }) => {
  await register(page, admin.name, admin.email);
  // Solange das Profil fehlt, führen App-Seiten zurück zum Onboarding
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding/);
  // Datenschutzinformationen bleiben erreichbar
  await page.goto("/datenschutz");
  await expect(page.getByRole("heading", { name: "Datenschutzhinweise" })).toBeVisible();
  await page.goto("/onboarding");
  await expect(page.getByRole("button", { name: "Weiter" })).toBeDisabled();
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: /Ada Admin/ })).toBeVisible();
  await expect(page.getByText("Noch keine Einträge", { exact: true })).toBeVisible();
  // Abmelden und wieder anmelden
  await logout(page);
  await login(page, admin.email);
});

test("2. Standardgetränk erfassen", async ({ page }) => {
  await login(page, admin.email);
  await logDrink(page, /Bier 0,5 l/, 2);
  await expect(page.getByText("Summe: 39,5 g")).toBeVisible();
});

test("3. Eigenes Getränk anlegen und erfassen", async ({ page }) => {
  await login(page, admin.email);
  await page.goto("/getraenke");
  await page.getByRole("button", { name: "Neu" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Hausbier Hell");
  await dialog.getByLabel("Volumen (ml)").fill("400");
  await dialog.getByLabel("Alkohol (% vol)").fill("5,2");
  await expect(dialog.getByText("16,4 g")).toBeVisible();
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Getränk angelegt.")).toBeVisible();
  await expect(page.getByText("Hausbier Hell")).toBeVisible();

  await logDrink(page, /Hausbier Hell/);
  await expect(page.getByText("Summe: 55,9 g")).toBeVisible();
});

test("4. Dashboard, Kalender, Verlauf und Statistik zeigen die erfassten Daten", async ({ page }) => {
  await login(page, admin.email);
  await expect(page.getByText("55,9 g").first()).toBeVisible();
  await expect(page.getByText("Geschätzter Modellwert")).toBeVisible();
  await expect(page.getByText(/Jetzt ca\./i)).toBeVisible();
  await expect(page.getByText(/keine Messung/).first()).toBeVisible();

  await page.goto("/kalender");
  await expect(page.getByText("2 Einträge · 55,9 g")).toBeVisible();
  await expect(page.getByText("Hausbier Hell").first()).toBeVisible();

  await page.goto("/verlauf");
  await expect(page.getByText(/2 Einträge · 3 Portionen · 55,9 g/)).toBeVisible();

  await page.goto("/statistik?zeitraum=7d");
  await expect(page.getByText("Konsummenge pro Tag")).toBeVisible();
  await expect(page.getByText("Verteilung nach Kategorie")).toBeVisible();
});

test("5. Sitzung bleibt nach Browser-Neustart erhalten (nur mit 'Angemeldet bleiben')", async ({ browser }) => {
  // Persistente Anmeldung
  const ctx1 = await browser.newContext();
  const p1 = await ctx1.newPage();
  await login(p1, admin.email, true);
  const persistent = (await ctx1.storageState()).cookies.filter((c) => c.expires > 0); // Sitzungscookies gehen beim Neustart verloren
  expect(persistent.some((c) => c.name === "pegel.session_token" && c.httpOnly)).toBe(true);
  await ctx1.close();
  const ctx2 = await browser.newContext({ storageState: { cookies: persistent, origins: [] } });
  const p2 = await ctx2.newPage();
  await p2.goto("/dashboard");
  await expect(p2).toHaveURL(/\/dashboard/);
  await ctx2.close();

  // Ohne "Angemeldet bleiben": Cookie ohne Ablaufdatum → nach Neustart abgemeldet
  const ctx3 = await browser.newContext();
  const p3 = await ctx3.newPage();
  await login(p3, admin.email, false);
  const remaining = (await ctx3.storageState()).cookies.filter((c) => c.expires > 0);
  expect(remaining.some((c) => c.name === "pegel.session_token")).toBe(false);
  await ctx3.close();
  const ctx4 = await browser.newContext({ storageState: { cookies: remaining, origins: [] } });
  const p4 = await ctx4.newPage();
  await p4.goto("/dashboard");
  await expect(p4).toHaveURL(/\/anmelden/);
  await ctx4.close();
});

test("6. Benutzer können nicht auf private Daten anderer zugreifen", async ({ page, browser }) => {
  // Eintrags-ID des Admins ermitteln
  await login(page, admin.email);
  const own = await page.evaluate(async () => (await fetch("/api/v1/entries")).json());
  const entryId = own.items[0].id as string;
  expect(entryId).toBeTruthy();

  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  await signupComplete(other, anna.name, anna.email);
  const status = await other.evaluate(async (id) => (await fetch(`/api/v1/entries/${id}`)).status, entryId);
  expect(status).toBe(404);
  const del = await other.evaluate(async (id) => (await fetch(`/api/v1/entries/${id}`, { method: "DELETE" })).status, entryId);
  expect(del).toBe(404);
  const list = await other.evaluate(async () => (await fetch("/api/v1/entries")).json());
  expect(list.total).toBe(0);
  await other.goto("/getraenke");
  await expect(other.getByText("Hausbier Hell")).toHaveCount(0);
  await ctx.close();
});

test("7. Normale Benutzer können die Administration nicht verwenden", async ({ page }) => {
  await login(page, anna.email);
  await expect(page.getByRole("link", { name: "Administration" })).toHaveCount(0);
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Seite nicht gefunden")).toBeVisible();
  const api = await page.evaluate(async () => (await fetch("/api/v1/admin/users")).status);
  expect(api).toBe(403);
});

test("8. Administrator sieht Benutzerübersicht und Aktivitätsprotokoll", async ({ page }) => {
  await login(page, admin.email);
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Anna" })).toBeVisible();
  await expect(page.getByText(anna.email)).toBeVisible();
  await page.getByRole("link", { name: "Anna" }).click();
  await expect(page.getByText("Letzter erfolgreicher Login")).toBeVisible();
  await expect(page.getByText(/Einzelne Konsumeinträge sind aus Datenschutzgründen nicht einsehbar/)).toBeVisible();
  await page.goto("/admin/protokoll");
  await expect(page.getByText("Registrierung").first()).toBeVisible();
  await expect(page.getByText("Unberechtigter Zugriff").first()).toBeVisible();
  await expect(page.getByText("Login").first()).toBeVisible();
});

test("9. Theme-Einstellungen bleiben nach erneutem Login erhalten", async ({ page }) => {
  await login(page, anna.email);
  await page.goto("/einstellungen/darstellung");
  await page.getByText("Sunset", { exact: true }).click();
  await page.getByText("Hell", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-scheme", "sunset");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(/Darstellung gespeichert/)).toBeVisible();
  await logout(page);
  await expect(page.locator("html")).toHaveAttribute("data-scheme", "midnight");
  await login(page, anna.email);
  await expect(page.locator("html")).toHaveAttribute("data-scheme", "sunset");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
});

test("Bearbeiten und Löschen eines Eintrags im Kalender", async ({ page }) => {
  await login(page, anna.email);
  await logDrink(page, /Sekt/);
  await page.goto("/kalender");
  await page.getByRole("button", { name: "Sekt bearbeiten" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Portionen").fill("2");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Eintrag gespeichert.")).toBeVisible();
  await expect(page.getByText("17,4 g").first()).toBeVisible();
  await page.getByRole("button", { name: "Sekt löschen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText("Eintrag gelöscht.")).toBeVisible();
  await expect(page.getByText("An diesem Tag wurde nichts erfasst.")).toBeVisible();
});

test("Sicherheits-Header und kein Caching privater API-Antworten", async ({ page }) => {
  const res = await page.goto("/anmelden");
  const h = res!.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  await login(page, admin.email);
  const cache = await page.evaluate(async () => (await fetch("/api/v1/me")).headers.get("cache-control"));
  expect(cache).toContain("no-store");
  expect(PASSWORD.length).toBeGreaterThan(9);
});
