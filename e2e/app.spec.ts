import { expect, test } from "@playwright/test";

test("prikaže občinski pregled in pokritost", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Pregled nepremičnine", exact: true })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "211.923" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Poiščite nepremičnino" })).toBeVisible();
});

test("najde naslov in odpre poročilo", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Vnesite naslov, parcelo, stavbo ali ID posla").fill("Slovenska cesta 1");
  await page.getByRole("button", { name: "Poišči" }).click();
  const result = page.getByRole("link", { name: /Slovenska cesta 1, Ljubljana/ });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByRole("heading", { name: "Slovenska cesta 1, Ljubljana" })).toBeVisible();
  await expect(page.getByText("Podatki so informativni.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Primerljive prodaje v bližini" })).toBeVisible();
  await page.getByRole("button", { name: "Shrani" }).click();
  await expect(page.getByText("Poročilo je shranjeno v tem brskalniku")).toBeVisible();
  await page.getByRole("button", { name: "Dodaj v primerjavo" }).click();
  await expect(page.getByText("Dodano v primerjavo")).toBeVisible();
  await page.goto("/primerjava-nepremicnin");
  await expect(page.getByRole("heading", { name: "Izbrane nepremičnine" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Slovenska cesta 1, Ljubljana" })).toBeVisible();
});

test("najde parcelo po katastrskem identifikatorju", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Vnesite naslov, parcelo, stavbo ali ID posla").fill("1723-45/2");
  await page.getByRole("button", { name: "Poišči" }).click();
  await expect(page.getByRole("link", { name: /Parcela 1723 45\/2/ })).toBeVisible();
});

test("filtrira celotno podatkovno bazo", async ({ page }) => {
  await page.goto("/iskanje?type=parcel&municipality=061&minArea=400&maxArea=800&sort=area-asc", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Iskanje po bazi" })).toBeVisible();
  await expect(page.getByLabel("Vrsta zapisa")).toHaveValue("parcel");
  await expect(page.getByRole("heading", { name: "Rezultati" })).toBeVisible();
  await expect(page.locator("a[href^='/nepremicnina/parcel/']").first()).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Pregled nepremičnine", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobilna navigacija" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator("main")).toHaveCSS("width", "390px");
});
