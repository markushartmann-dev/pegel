import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

export const PASSWORD = "e2e-test-passwort-2026";

export function uniqueEmail(prefix = "user") {
  return `${prefix}-${randomUUID().slice(0, 8)}@e2e.test`;
}

export async function register(page: Page, name: string, email: string) {
  await page.goto("/registrieren");
  await page.getByLabel("Anzeigename").fill(name);
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Passwort wiederholen").fill(PASSWORD);
  await page.getByRole("button", { name: "Registrieren" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
}

export async function completeOnboarding(page: Page, opts: { weight?: string; height?: string } = {}) {
  await page.getByLabel(/Datenschutzhinweise/).check();
  await page.getByLabel(/Ich willige ein/).check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByLabel("Berechnungsprofil").selectOption("WIDMARK_FEMALE");
  await page.getByLabel("Körpergewicht (kg)").fill(opts.weight ?? "68");
  await page.getByLabel("Körpergröße (cm)").fill(opts.height ?? "170");
  await expect(page.getByText("Verwendeter Verteilungsfaktor: 0,55")).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Einrichtung abschließen" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function signupComplete(page: Page, name: string, email = uniqueEmail()) {
  await register(page, name, email);
  await completeOnboarding(page);
  return email;
}

export async function login(page: Page, email: string, remember = true) {
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(PASSWORD);
  const box = page.getByLabel(/Angemeldet bleiben/);
  if (remember) await box.check();
  else await box.uncheck();
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page: Page) {
  const button = page.getByRole("button", { name: "Abmelden" }).first();
  await button.click();
  await expect(page).toHaveURL(/\/anmelden/);
}

export async function logDrink(page: Page, beverage: string | RegExp, servings = 1) {
  await page.goto("/erfassen");
  await page.getByRole("button", { name: beverage }).first().click();
  for (let i = 1; i < servings; i++) await page.getByRole("button", { name: "Eine Portion mehr" }).click();
  await page.getByRole("button", { name: "Erfassen", exact: true }).click();
  await expect(page.getByText(/erfasst \(/)).toBeVisible();
}
