import { expect, test, type Locator, type Page } from "@playwright/test";

const onglets = ["Activités", "Mon Événement", "Proposer", "Voisins & Profil"];

test("l'accueil affiche la résidence, les activités et la navigation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toContainText(
    "Résidence Les Tilleuls",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();

  const navigation = navigationPrincipale(page);
  await expect(navigation).toBeVisible();
  for (const onglet of onglets) {
    await expect(navigation.getByRole("link", { name: onglet })).toBeVisible();
  }
  await expect(
    navigation.getByRole("link", { name: "Activités" }),
  ).toHaveAttribute("aria-current", "page");

  await page.screenshot({
    path: test.info().outputPath("accueil.png"),
    fullPage: true,
  });
});

test("chaque onglet offre une cible tactile d'au moins 52 px", async ({
  page,
}) => {
  await page.goto("/");

  const navigation = navigationPrincipale(page);
  for (const onglet of onglets) {
    const boite = await navigation
      .getByRole("link", { name: onglet })
      .boundingBox();
    expect(boite?.width).toBeGreaterThanOrEqual(52);
    expect(boite?.height).toBeGreaterThanOrEqual(52);
  }
});

test("la navigation se parcourt et s'active au clavier", async ({ page }) => {
  await page.goto("/");

  const navigation = navigationPrincipale(page);
  const proposer = navigation.getByRole("link", { name: "Proposer" });
  await tabulerJusqua(page, proposer);
  await expect(proposer).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/proposer$/);
  await expect(
    navigationPrincipale(page).getByRole("link", { name: "Proposer" }),
  ).toHaveAttribute("aria-current", "page");
});

function navigationPrincipale(page: Page) {
  return page.getByRole("navigation", { name: "Navigation principale" });
}

/** Appuie sur Tab jusqu'à atteindre la cible, comme le ferait une personne au clavier. */
async function tabulerJusqua(page: Page, cible: Locator, maxAppuis = 20) {
  for (let i = 0; i < maxAppuis; i++) {
    await page.keyboard.press("Tab");
    if (await cible.evaluate((el) => el === document.activeElement)) return;
  }
}
