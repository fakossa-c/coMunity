import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouvelleActivite,
  nouveauResident,
  nouveauSyndic,
  supprimerComptes,
  titreAccueil,
} from "./outils";

// Ticket #38 : sur ordinateur, les éléments propres au mobile ont leur équivalent de bureau.
test.skip(
  ({ isMobile }) => isMobile,
  "Affichage propre à l'ordinateur : le mobile a ses propres tests.",
);

test.use({ viewport: { width: 1600, height: 900 } });

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function residentConnecte(page: Page) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await expect(titreAccueil(page)).toBeVisible();
}

function navigationPrincipale(page: Page) {
  return page.getByRole("navigation", { name: "Navigation principale" });
}

async function boite(cible: Locator) {
  return (await cible.boundingBox())!;
}

function styleCalcule(cible: Locator, propriete: string) {
  return cible.evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p),
    propriete,
  );
}

test("les onglets sont dans l'en-tête, sans barre en bas", async ({ page }) => {
  await page.goto("/");

  const entete = page.getByRole("banner");
  const navigation = navigationPrincipale(page);
  await expect(entete.getByRole("navigation")).toHaveCount(1);
  await expect(navigation.getByRole("link")).toHaveCount(3);
  expect(await styleCalcule(navigation, "position")).not.toBe("fixed");

  const enteteBoite = await boite(entete);
  const navigationBoite = await boite(navigation);
  expect(navigationBoite.y).toBeGreaterThanOrEqual(enteteBoite.y);
  expect(navigationBoite.y + navigationBoite.height).toBeLessThanOrEqual(
    enteteBoite.y + enteteBoite.height,
  );
  // Rien ne reste collé au bas de la fenêtre.
  expect(navigationBoite.y + navigationBoite.height).toBeLessThan(200);
});

test("l'onglet actif garde aria-current et son apparence, et chaque onglet mène à sa page", async ({
  page,
}) => {
  await page.goto("/activites");

  const navigation = navigationPrincipale(page);
  const actif = navigation.getByRole("link", { name: "Activités" });
  const autre = navigation.getByRole("link", { name: "Annonces" });
  await expect(actif).toHaveAttribute("aria-current", "page");
  await expect(autre).not.toHaveAttribute("aria-current");
  expect(await styleCalcule(actif.locator("span").last(), "font-weight")).toBe(
    "800",
  );
  expect(await styleCalcule(autre.locator("span").last(), "font-weight")).toBe(
    "700",
  );
  // Pilule pêche derrière le pictogramme de l'onglet actif, transparente sinon.
  expect(
    await styleCalcule(actif.locator("span").first(), "background-color"),
  ).toBe("rgb(255, 219, 208)");
  expect(
    await styleCalcule(autre.locator("span").first(), "background-color"),
  ).toBe("rgba(0, 0, 0, 0)");

  await autre.click();
  await expect(page).toHaveURL(/\/annonces$/);
  await expect(
    navigationPrincipale(page).getByRole("link", { name: "Annonces" }),
  ).toHaveAttribute("aria-current", "page");
});

test("le parcours au clavier traverse les onglets de l'en-tête", async ({
  page,
}) => {
  await page.goto("/");

  await navigationPrincipale(page)
    .getByRole("link", { name: "Accueil" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    navigationPrincipale(page).getByRole("link", { name: "Activités" }),
  ).toBeFocused();
});

test("Activités propose « Proposer une activité » sous son titre, sans bouton flottant", async ({
  page,
}) => {
  await page.goto("/activites");

  const proposer = page.getByRole("link", { name: "Proposer une activité" });
  await expect(proposer).toBeVisible();
  expect(await styleCalcule(proposer, "position")).not.toBe("fixed");
  const titre = await boite(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  );
  expect((await boite(proposer)).y).toBeGreaterThanOrEqual(
    titre.y + titre.height,
  );
  // Un seul lien « Proposer » visible : le flottant du mobile n'est plus là.
  await expect(page.getByRole("link", { name: /^Proposer/ })).toHaveCount(1);

  await proposer.click();
  await expect(page).toHaveURL(/\/proposer$/);
});

test("les écrans des résidents sont dans une colonne centrée", async ({
  page,
}) => {
  await page.goto("/annonces");

  const viewport = page.viewportSize()!;
  const contenu = await boite(page.getByRole("main"));
  expect(contenu.width).toBeLessThan(viewport.width * 0.75);
  expect(contenu.x + contenu.width / 2).toBeCloseTo(viewport.width / 2, -1);
  // L'en-tête suit la même colonne : le logo s'aligne sur le contenu.
  const logo = await boite(
    page.getByRole("banner").getByRole("img", { name: "coMunity" }),
  );
  expect(logo.x).toBeGreaterThanOrEqual(contenu.x);
});

test("le menu de l'avatar s'ouvre en panneau latéral droit, avec le clavier habituel", async ({
  page,
}) => {
  await residentConnecte(page);
  const avatar = page.getByRole("button", { name: "Mon profil" });
  const menu = page.getByRole("dialog", { name: "Menu du profil" });

  await avatar.click();
  await expect(menu).toBeVisible();
  // Le panneau entre par la droite, pas par le bas.
  expect(await menu.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "panneau-entre",
  );
  // Laisse finir l'entrée du panneau avant de mesurer.
  await menu.evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  );
  const viewport = page.viewportSize()!;
  const panneau = await boite(menu);
  expect(panneau.x + panneau.width).toBeCloseTo(viewport.width, -1);
  expect(panneau.height).toBeCloseTo(viewport.height, -1);
  expect(panneau.width).toBeLessThan(viewport.width / 2);
  await expect(menu.getByRole("button", { name: "Fermer" })).toBeVisible();

  for (const touche of Array(10).fill("Tab")) {
    await page.keyboard.press(touche);
    expect(
      await menu.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(avatar).toBeFocused();
});

test("un compte refusé n'a ni onglets ni « Proposer une activité », seulement la déconnexion", async ({
  page,
}) => {
  const resident = await nouveauResident("refuse");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Compte non accepté" }),
  ).toBeVisible();
  await expect(navigationPrincipale(page)).toHaveCount(0);

  await page.goto("/activites");
  await expect(page.getByRole("link", { name: /^Proposer/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Mon profil" }).click();
  const menu = page.getByRole("dialog", { name: "Menu du profil" });
  await expect(menu.getByRole("link")).toHaveCount(0);
  await expect(
    menu.getByRole("button", { name: "Se déconnecter" }),
  ).toBeVisible();
});

test("la barre d'action est collée au bas de la colonne", async ({ page }) => {
  await residentConnecte(page);
  await page.goto("/profil/identifiants/email");

  const enregistrer = page.getByRole("button", { name: "Enregistrer" });
  await expect(enregistrer).toBeVisible();
  // La barre est le plus proche ancêtre du bouton dont la position est fixe.
  const barre = await enregistrer.evaluate((el) => {
    let cible: HTMLElement | null = el.parentElement;
    while (cible && getComputedStyle(cible).position !== "fixed") {
      cible = cible.parentElement;
    }
    const { x, y, width, height } = cible!.getBoundingClientRect();
    return { x, y, width, height };
  });
  const viewport = page.viewportSize()!;
  const contenu = await boite(page.getByRole("main"));
  expect(barre.y + barre.height).toBeCloseTo(viewport.height, -1);
  expect(barre.x).toBeCloseTo(contenu.x, -1);
  expect(barre.width).toBeCloseTo(contenu.width, -1);
});

test("l'espace syndic occupe toute la largeur, avec les mêmes cartes", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await seConnecter(page, syndic.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Espace syndic" }),
  ).toBeVisible();

  const viewport = page.viewportSize()!;
  const contenu = await boite(page.getByRole("main"));
  expect(contenu.width).toBeGreaterThan(viewport.width - 40);
  // Les rubriques restent des cartes : elles se rangent en colonnes sur la largeur.
  const rubriques = page.getByRole("main").getByRole("link");
  expect((await boite(rubriques.nth(1))).x).toBeGreaterThan(
    (await boite(rubriques.first())).x,
  );
});

test("les cartes d'activité s'alignent en deux colonnes au lieu de s'étirer sur toute la colonne", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const demain = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await nouvelleActivite(resident.id, {
    titre: "Grille : première",
    date_activite: demain,
  });
  await nouvelleActivite(resident.id, {
    titre: "Grille : seconde",
    date_activite: demain,
  });
  await seConnecter(page, resident.email);
  await expect(titreAccueil(page)).toBeVisible();

  const cartes = page
    .getByRole("region", { name: "Activités à venir" })
    .getByRole("article")
    .filter({ hasText: "Grille :" });
  await expect(cartes).toHaveCount(2);
  const premiere = await boite(cartes.first());
  const seconde = await boite(cartes.last());
  const colonne = await boite(page.locator("main"));
  expect(premiere.width).toBeLessThan(colonne.width * 0.6);
  expect(seconde.x).toBeGreaterThan(premiere.x + premiere.width - 1);
  expect(Math.abs(seconde.y - premiere.y)).toBeLessThan(2);
});
