import { expect, test, type Locator, type Page } from "@playwright/test";

const onglets = [
  { libelle: "Accueil", chemin: "/" },
  { libelle: "Activités", chemin: "/activites" },
  { libelle: "Annonces", chemin: "/annonces" },
];

test("l'accueil affiche le logo, la résidence et la barre du bas", async ({
  page,
}) => {
  await page.goto("/");

  const entete = page.getByRole("banner");
  await expect(entete).toContainText("Résidence Les Tilleuls");
  await expect(entete.getByRole("img", { name: "coMunity" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();

  const navigation = navigationPrincipale(page);
  await expect(navigation.getByRole("link")).toHaveCount(onglets.length);
  for (const { libelle } of onglets) {
    await expect(navigation.getByRole("link", { name: libelle })).toBeVisible();
  }
  await expect(
    navigation.getByRole("link", { name: "Accueil" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    navigation.getByRole("link", { name: "Activités" }),
  ).not.toHaveAttribute("aria-current");
});

test("un visiteur voit « Se connecter » à la place de l'avatar", async ({
  page,
}) => {
  await page.goto("/");

  const entete = page.getByRole("banner");
  await expect(
    entete.getByRole("link", { name: "Se connecter" }),
  ).toBeVisible();
  await expect(entete.getByRole("button", { name: "Mon profil" })).toHaveCount(
    0,
  );

  await entete.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});

test.describe("à 360 px", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("chaque onglet tient sur une ligne et offre une cible d'au moins 52 px", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-taille", "grands"),
    );

    const navigation = navigationPrincipale(page);
    for (const { libelle } of onglets) {
      const lien = navigation.getByRole("link", { name: libelle });
      const boite = await lien.boundingBox();
      expect(boite?.width).toBeGreaterThanOrEqual(52);
      expect(boite?.height).toBeGreaterThanOrEqual(52);
      expect(await lignesDuLibelle(lien)).toBe(1);
    }
  });

  test("l'en-tête défile, la barre du bas reste fixe sans masquer le contenu", async ({
    page,
  }) => {
    await page.goto("/");
    const entete = page.getByRole("banner");
    const navigation = navigationPrincipale(page);

    expect(await position(entete)).not.toMatch(/fixed|sticky/);
    expect(await position(navigation)).toBe("fixed");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const contenu = await basDuContenu(page);
    const barre = (await navigation.boundingBox())!;
    expect(contenu).toBeLessThanOrEqual(barre.y);
    expect(barre.y + barre.height).toBeCloseTo(640, 0);
  });
});

test("la barre du bas se parcourt et s'active au clavier", async ({ page }) => {
  await page.goto("/");

  const annonces = navigationPrincipale(page).getByRole("link", {
    name: "Annonces",
  });
  await tabulerJusqua(page, annonces);
  await expect(annonces).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/annonces$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Annonces" }),
  ).toBeVisible();
  await expect(
    navigationPrincipale(page).getByRole("link", { name: "Annonces" }),
  ).toHaveAttribute("aria-current", "page");
});

test("chaque onglet mène à sa page, sous le même en-tête", async ({ page }) => {
  await page.goto("/");

  for (const { libelle, chemin } of onglets) {
    await navigationPrincipale(page)
      .getByRole("link", { name: libelle })
      .click();
    await expect(page).toHaveURL(new RegExp(`${chemin}$`));
    await expect(page.getByRole("banner")).toContainText(
      "Résidence Les Tilleuls",
    );
    await expect(
      navigationPrincipale(page).getByRole("link", { name: libelle }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("le bouton « Proposer » n'apparaît que sur Activités et mène à /proposer", async ({
  page,
}) => {
  for (const chemin of ["/", "/annonces"]) {
    await page.goto(chemin);
    await expect(page.getByRole("link", { name: "Proposer" })).toHaveCount(0);
  }

  await page.goto("/activites");
  const proposer = page.getByRole("link", { name: "Proposer" });
  await expect(proposer).toBeVisible();
  expect(await position(proposer)).toBe("fixed");
  await proposer.click();
  await expect(page).toHaveURL(/\/proposer$/);
});

test("les rubriques pas encore ouvertes ont leur titre et un message d'attente", async ({
  page,
}) => {
  for (const [chemin, titre] of [
    ["/activites", "Activités"],
    ["/annonces", "Annonces"],
    ["/mon-syndic", "Mon syndic"],
    ["/ma-copro", "Ma copro"],
  ]) {
    await page.goto(chemin);
    await expect(
      page.getByRole("heading", { level: 1, name: titre }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("ouvrira bientôt");
  }
});

test("une page secondaire a une barre de retour collante, sans barre du bas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await page.goto("/mon-syndic");

  const retour = page.getByRole("link", { name: "Accueil" });
  await expect(retour).toBeVisible();
  await expect(navigationPrincipale(page)).toHaveCount(0);
  expect(await position(page.getByRole("banner"))).toBe("sticky");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(retour).toBeInViewport();
  await retour.click();
  await expect(page).toHaveURL(/\/$/);
});

test("les anciennes pages n'existent plus", async ({ page }) => {
  for (const chemin of ["/mon-evenement", "/voisins-profil"]) {
    const reponse = await page.goto(chemin);
    expect(reponse?.status()).toBe(404);
  }
});

function navigationPrincipale(page: Page) {
  return page.getByRole("navigation", { name: "Navigation principale" });
}

function position(cible: Locator) {
  return cible.evaluate((el) => getComputedStyle(el).position);
}

/** Bas du dernier élément du contenu principal, dans le repère de la fenêtre. */
function basDuContenu(page: Page) {
  return page
    .getByRole("main")
    .evaluate((main) =>
      Math.max(
        ...[...main.querySelectorAll("*")].map(
          (el) => el.getBoundingClientRect().bottom,
        ),
      ),
    );
}

/** Nombre de lignes occupées par le texte du lien. */
function lignesDuLibelle(lien: Locator) {
  return lien.evaluate((el) => {
    const parcours = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lignes = new Set<number>();
    while (parcours.nextNode()) {
      const plage = document.createRange();
      plage.selectNodeContents(parcours.currentNode);
      for (const r of plage.getClientRects()) lignes.add(Math.round(r.top));
    }
    return lignes.size;
  });
}

/** Appuie sur Tab jusqu'à atteindre la cible, comme le ferait une personne au clavier. */
async function tabulerJusqua(page: Page, cible: Locator, maxAppuis = 20) {
  for (let i = 0; i < maxAppuis; i++) {
    await page.keyboard.press("Tab");
    if (await cible.evaluate((el) => el === document.activeElement)) return;
  }
}
