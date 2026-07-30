import { expect, test } from "@playwright/test";

test("prikaže občinski pregled in pokritost", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Ljubljana", exact: true })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "211.923" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Poiščite nepremičnino" })).toBeVisible();
});

test("najde naslov in odpre poročilo", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("npr. Slovenska cesta 1 ali 1723-45/2").fill("Slovenska cesta 1");
  await page.getByRole("button", { name: "Poišči" }).click();
  const result = page.getByRole("link", { name: /Slovenska cesta 1, Ljubljana/ });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByRole("heading", { name: "Slovenska cesta 1, Ljubljana" })).toBeVisible();
  await expect(page.getByText("Podatki so informativni.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Primerljive prodaje v bližini" })).toBeVisible();
  await page.getByRole("button", { name: "Shrani" }).click();
  await expect(page.getByText("Poročilo je shranjeno v tem brskalniku")).toBeVisible();
});

test("najde parcelo po katastrskem identifikatorju", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("npr. Slovenska cesta 1 ali 1723-45/2").fill("1723-45/2");
  await page.getByRole("button", { name: "Poišči" }).click();
  await expect(page.getByRole("link", { name: /Parcela 1723 45\/2/ })).toBeVisible();
});

test("zemljevid naloži podlago in podatke", async ({ page }) => {
  await page.goto("/zemljevid", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Interaktivni zemljevid poslov")).toBeVisible();
  await expect(page.getByText(/lokacij$/)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".ol-layer canvas").first()).toBeVisible();
});

test("primerja Ljubljano in Brezovico", async ({ page }) => {
  await page.goto("/primerjava", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Primerjava občin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prodajna aktivnost po letih" })).toBeVisible();
  await expect(page.getByText("Ljubljana · prodaje")).toBeVisible();
  await expect(page.getByText("Brezovica · prodaje")).toBeVisible();
});

test("mobilni pregled nima vodoravnega preliva", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Ljubljana", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator("main")).toHaveCSS("width", "390px");
});
