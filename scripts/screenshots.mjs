// Erzeugt Screenshots aller Bereiche aus einer Demo-Instanz (siehe scripts/demo-data.mjs).
//   DEMO_URL=http://localhost:3200 node scripts/screenshots.mjs
// Ergebnis: docs/screenshots/*.png
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.DEMO_URL ?? "http://localhost:3200";
const OUT = "docs/screenshots";
const PASSWORD = "demo-passwort-2026";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "de-DE", timezoneId: "Europe/Berlin" };
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "de-DE", timezoneId: "Europe/Berlin" };

async function session(email, opts = desktop) {
  const ctx = await browser.newContext({ ...opts, baseURL: BASE });
  const page = await ctx.newPage();
  if (email) {
    await page.goto("/anmelden");
    await page.getByLabel("E-Mail-Adresse").fill(email);
    await page.getByLabel("Passwort").fill(PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL(/dashboard/);
  }
  return { ctx, page };
}

async function shot(page, name, path, { full = false, before } = {}) {
  if (path) await page.goto(path, { waitUntil: "load" });
  if (before) await before(page);
  await page.waitForTimeout(1200);
  if (full) {
    // Ganze Seite: Viewport auf Seitenhöhe vergrößern, damit Seitenleiste (100dvh) mitwächst
    const size = page.viewportSize();
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: size.width, height });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await page.setViewportSize(size);
  } else {
    await page.screenshot({ path: `${OUT}/${name}.png` });
  }
  console.log(`✓ ${name}`);
}

// ─── Desktop, Lena (Midnight, dunkel, Administratorin) ───────────────────
{
  const anon = await session(null);
  await shot(anon.page, "00-anmelden", "/anmelden");
  await anon.ctx.close();

  const { ctx, page } = await session("lena@pegel.demo");
  await shot(page, "01-dashboard", "/dashboard", { full: true });
  await shot(page, "02-erfassen", "/erfassen", {
    before: async (p) => {
      await p.getByRole("button", { name: /^Riesling trocken 200 ml/ }).click();
      await p.getByRole("button", { name: "Eine Portion mehr" }).click();
    },
  });
  await shot(page, "03-kalender", "/kalender", { full: true });
  await shot(page, "04-statistik", "/statistik?zeitraum=30d", { full: true });
  await shot(page, "05-verlauf", "/verlauf");
  await shot(page, "06-getraenke", "/getraenke", { full: true });
  await shot(page, "07-community", "/community?zeitraum=month", { full: true });
  await shot(page, "08-darstellung", "/einstellungen/darstellung");
  await shot(page, "09-profil", "/einstellungen");
  await shot(page, "10-admin-benutzer", "/admin", { full: true });
  await shot(page, "11-admin-protokoll", "/admin/protokoll");
  await shot(page, "12-modell-hinweise", "/hinweise");
  await ctx.close();
}

// ─── Weitere Farbschemata ─────────────────────────────────────────────────
for (const [email, name, path] of [
  ["jonas@pegel.demo", "20-ocean-dashboard", "/dashboard"],
  ["max@pegel.demo", "21-sunset-statistik", "/statistik?zeitraum=30d"],
  ["sophie@pegel.demo", "22-forest-community", "/community?zeitraum=all"],
  ["aylin@pegel.demo", "23-neutral-hell-dashboard", "/dashboard"],
  ["aylin@pegel.demo", "24-neutral-hell-kalender", "/kalender"],
]) {
  const { ctx, page } = await session(email);
  await shot(page, name, path, { full: name.includes("community") || name.includes("statistik") });
  await ctx.close();
}

// ─── Mobil ────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await session("lena@pegel.demo", mobile);
  await shot(page, "30-mobil-dashboard", "/dashboard");
  await shot(page, "31-mobil-erfassen", "/erfassen", {
    before: async (p) => {
      await p.getByRole("button", { name: /^Sekt 100 ml/ }).click();
      await p.getByRole("button", { name: "Erfassen", exact: true }).scrollIntoViewIfNeeded();
    },
  });
  await shot(page, "32-mobil-kalender", "/kalender");
  await shot(page, "33-mobil-community", "/community?zeitraum=month");
  await shot(page, "34-mobil-menue", "/statistik", {
    before: async (p) => p.getByRole("button", { name: "Mehr" }).click(),
  });
  await ctx.close();
}
{
  const { ctx, page } = await session("max@pegel.demo", mobile);
  await shot(page, "35-mobil-sunset-dashboard", "/dashboard");
  await ctx.close();
}

// ─── Onboarding eines neuen Kontos (zuletzt, damit es nicht in den Rankings auftaucht) ───
{
  const { ctx, page } = await session(null);
  await page.goto("/registrieren");
  await page.getByLabel("Anzeigename").fill("Neu Hier");
  await page.getByLabel("E-Mail-Adresse").fill(`neu-${Date.now()}@pegel.demo`);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Passwort wiederholen").fill(PASSWORD);
  await shot(page, "13-registrieren");
  await page.getByRole("button", { name: "Registrieren" }).click();
  await page.waitForURL(/onboarding/);
  await shot(page, "14-onboarding-datenschutz");
  await page.getByLabel(/Datenschutzhinweise/).check();
  await page.getByLabel(/Ich willige ein/).check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByLabel("Körpergewicht (kg)").fill("75");
  await page.getByLabel("Körpergröße (cm)").fill("178");
  await shot(page, "15-onboarding-profil");
  await page.getByRole("button", { name: "Weiter" }).click();
  await shot(page, "16-onboarding-darstellung");
  await ctx.close();
}

await browser.close();
