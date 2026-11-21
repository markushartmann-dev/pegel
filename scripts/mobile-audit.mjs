// Prüft alle Seiten auf Handy-Breite: horizontale Überbreite und abgeschnittene Texte.
//   DEMO_URL=http://localhost:3200 node scripts/mobile-audit.mjs   (Demo-Daten vorher laden)
import { chromium } from "@playwright/test";

const BASE = process.env.DEMO_URL ?? "http://localhost:3200";
const PAGES = [
  "/dashboard", "/erfassen", "/kalender", "/kalender?ansicht=woche", "/statistik?zeitraum=30d", "/verlauf", "/verlauf?art=sport", "/erfassen?art=sport", "/sportarten", "/getraenke",
  "/community?zeitraum=month", "/einstellungen", "/einstellungen/darstellung", "/einstellungen/benachrichtigungen",
  "/einstellungen/sicherheit", "/einstellungen/daten", "/admin", "/admin/protokoll", "/admin/vorschlaege",
  "/hilfe", "/hinweise", "/neuigkeiten", "/datenschutz", "/impressum",
];

const browser = await chromium.launch();
let problems = 0;
for (const width of [375, 390]) {
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width, height: 844 }, isMobile: true, hasTouch: true, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const page = await ctx.newPage();
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill("lena@pegel.demo");
  await page.getByLabel("Passwort").fill("demo-passwort-2026");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(/dashboard/);
  for (const path of PAGES) {
    const res = await page.goto(path, { waitUntil: "load" });
    if (!res || res.status() >= 400) continue;
    await page.waitForTimeout(700);
    const report = await page.evaluate((vw) => {
      const out = { overflow: document.documentElement.scrollWidth - vw, wide: [], cut: [] };
      const label = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${String(el.className).split(" ").slice(0, 3).join(".")} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // innerhalb eines bewusst scrollbaren Bereichs ignorieren
        let p = el.parentElement, scroller = false;
        while (p) { const ox = getComputedStyle(p).overflowX; if (ox === "auto" || ox === "scroll") { scroller = true; break; } p = p.parentElement; }
        if (!scroller && r.right > vw + 1) out.wide.push(label(el));
        const cs = getComputedStyle(el);
        if (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) out.cut.push(label(el));
        if (scroller && el.parentElement && getComputedStyle(el.parentElement).overflowX === "auto" && el.parentElement.scrollWidth > el.parentElement.clientWidth + 1) out.cut.push("SCROLL " + label(el.parentElement));
      }
      out.wide = [...new Set(out.wide)].slice(0, 4);
      out.cut = [...new Set(out.cut)].slice(0, 6);
      return out;
    }, width);
    if (report.overflow > 0 || report.wide.length || report.cut.length) {
      problems++;
      console.log(`\n[${width}] ${path}  Überbreite: ${report.overflow}px`);
      for (const w of report.wide) console.log("   breit: " + w);
      for (const c of report.cut) console.log("   abgeschnitten: " + c);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `\n${problems} Befund(e).` : "Keine Befunde.");
