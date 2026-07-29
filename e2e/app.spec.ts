import { expect, test } from "@playwright/test";

test("odpre podrobnosti posla iz tabele", async ({ page }) => {
  await page.goto("/posli?q=522071", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "522071", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Posel 522071/ })).toBeVisible();
  await expect(page.getByText("Pogodbena cena pripada celotnemu poslu")).toBeVisible();
  await expect(page.getByText("Trenutna posplošena vrednost", { exact: true })).toBeVisible();
});

test("zemljevid se osnovno nalozi", async ({ page }) => {
  await page.goto("/zemljevid?onlyLocated=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("map")).toHaveAttribute("data-map-ready", "true");
  await expect(page.getByTestId("map")).toHaveAttribute("data-sales-features", "810");
  await expect(page.getByTestId("map")).toHaveAttribute("data-map-rendered", "true");
  await expect(page.getByText("Parcelne meje")).toBeVisible();
  await page.getByLabel("Podlaga").selectOption("ortho");
  await expect(page.getByTestId("gurs-ortho-map")).toBeVisible();
  await expect(page.getByText(/Prikaz uporablja izvorni CRS EPSG:3794/)).toBeVisible();
});

test("odpre neposredne podrobnosti parcele in stavbe", async ({ page }) => {
  await page.goto("/parcele?eid=100101000002602965&ko=1724", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Parcela 1724/1126/26" })).toBeVisible();
  await expect(page.getByText("Trenutna posplošena vrednost")).toBeVisible();

  await page.goto("/stavbe?eid=100200000214576304&ko=1724", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Stavba 1724/711" })).toBeVisible();
  await expect(page.getByText(/Deli stavbe n =/)).toBeVisible();
});

test("zacasne najeme prikaze samo po izrecnem filtru", async ({ page }) => {
  await page.goto("/najemi", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("V zbirki še ni dokončno potrjenih tržnih najemov.")).toBeVisible();
  await page.getByLabel("Prikaži tudi začasne in netržne posle").check();
  await expect(page.getByText("Najemni posli n = 21")).toBeVisible();
  await expect(page.getByText("V preverjanju").first()).toBeVisible();
});

test("ob napaki ortofota varno preklopi na osnovni zemljevid", async ({ page }) => {
  await page.route("https://ipi.eprostor.gov.si/**", (route) => route.abort());
  await page.goto("/zemljevid?onlyLocated=1", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Podlaga").selectOption("ortho");
  await expect(page.getByText("GURS ortofoto trenutno ni dosegljiv. Prikazana je osnovna podlaga.")).toBeVisible();
  await expect(page.getByTestId("map")).toBeVisible();
});

test("mobilni katalog nima vodoravnega preliva", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/parcele", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Parcele" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator("main")).toHaveCSS("width", "390px");
});
