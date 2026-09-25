import { expect, test, type Locator, type Page } from "@playwright/test";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "../../src/lib/mot-de-passe";
import { lienRecu, nouveauResident, supprimerComptes } from "./outils";

const AIDE_MOT_DE_PASSE = `Au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`;

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

/** Pose un attribut d'affichage sur la racine du document, comme le fera le réglage du profil. */
async function poserSurLaRacine(page: Page, nom: string, valeur: string) {
  await page.evaluate(
    ([n, v]) => document.documentElement.setAttribute(n, v),
    [nom, valeur],
  );
}

function styleCalcule(cible: Locator, propriete: string) {
  return cible.evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p),
    propriete,
  );
}

test("l'onglet du navigateur porte le nom de l'app", async ({ page }) => {
  await page.goto("/connexion");
  await expect(page).toHaveTitle("Connexion · coMunity");
});

test("le logo coMunity passe à sa variante inversée en thème sombre", async ({
  page,
}) => {
  await page.goto("/connexion");
  const logo = page.getByRole("img", { name: "coMunity" });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /logo-couleur/);

  await poserSurLaRacine(page, "data-theme", "sombre");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /logo-inverse/);
});

test("le thème sombre change le fond, le texte, les champs et le focus", async ({
  page,
}) => {
  await page.goto("/connexion");
  const corps = page.locator("body");
  const email = page.getByLabel("Adresse email");
  expect(await styleCalcule(corps, "background-color")).toBe(
    "rgb(248, 249, 255)",
  );

  await poserSurLaRacine(page, "data-theme", "sombre");
  expect(await styleCalcule(corps, "background-color")).toBe("rgb(18, 28, 42)");
  expect(await styleCalcule(corps, "color")).toBe("rgb(235, 241, 255)");
  // Le fond visible d'un champ est celui de sa boîte, qui entoure la saisie.
  expect(await styleCalcule(email.locator(".."), "background-color")).toBe(
    "rgb(27, 38, 54)",
  );

  await email.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(email).toBeFocused();
  expect(await styleCalcule(email, "outline-color")).toBe("rgb(169, 199, 255)");
  expect(await styleCalcule(email, "outline-width")).toBe("3px");
});

test.describe("grands caractères", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("le texte courant passe de 18 à 23 px", async ({ page }) => {
    await page.goto("/connexion");
    const texte = page
      .getByRole("main")
      .getByText("Accédez à votre espace avec votre email");
    expect(await styleCalcule(texte, "font-size")).toBe("18px");

    await poserSurLaRacine(page, "data-taille", "grands");
    expect(await styleCalcule(texte, "font-size")).toBe("23px");
  });

  for (const chemin of ["/connexion", "/mot-de-passe-oublie"]) {
    test(`${chemin} ne défile pas horizontalement à 360 px`, async ({
      page,
    }) => {
      await page.goto(chemin);
      await poserSurLaRacine(page, "data-taille", "grands");
      await attendreSansDefilementHorizontal(page);
    });
  }

  test("le formulaire du nouveau mot de passe, erreur comprise, ne défile pas horizontalement à 360 px", async ({
    page,
  }) => {
    await ouvrirLeLienDuNouveauMotDePasse(page);
    await poserSurLaRacine(page, "data-taille", "grands");
    await page.getByLabel("Nouveau mot de passe").fill("un-mot-de-passe");
    await page.getByLabel("Confirmez le mot de passe").fill("un-autre");
    await page
      .getByRole("button", { name: "Enregistrer le mot de passe" })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "pas identiques" }),
    ).toBeVisible();
    await attendreSansDefilementHorizontal(page);
  });
});

test("les boutons sont des pilules et les liens des cibles de 52 px", async ({
  page,
}) => {
  await page.goto("/connexion");
  const bouton = page.getByRole("button", { name: "Se connecter" });
  const boite = (await bouton.boundingBox())!;
  expect(boite.height).toBeGreaterThanOrEqual(52);
  expect(parseFloat(await styleCalcule(bouton, "border-top-left-radius"))).toBe(
    9999,
  );

  for (const nom of ["Mot de passe oublié ?", "Créer mon compte"]) {
    const lien = (await page.getByRole("link", { name: nom }).boundingBox())!;
    expect(lien.height).toBeGreaterThanOrEqual(52);
  }
});

test("le mot de passe s'affiche et se masque à la demande", async ({
  page,
}) => {
  await page.goto("/connexion");
  const motDePasse = page.getByLabel("Mot de passe", { exact: true });
  await expect(motDePasse).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: /^Afficher/ }).click();
  await expect(motDePasse).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: /^Masquer/ }).click();
  await expect(motDePasse).toHaveAttribute("type", "password");
});

test("libellé au-dessus du champ, aide et erreur en dessous", async ({
  page,
}) => {
  await ouvrirLeLienDuNouveauMotDePasse(page);

  const nouveau = page.getByLabel("Nouveau mot de passe");
  const confirmation = page.getByLabel("Confirmez le mot de passe");
  await expect(nouveau).toHaveAccessibleDescription(AIDE_MOT_DE_PASSE);
  await attendreAuDessus(
    page.locator("label", { hasText: "Nouveau mot de passe" }),
    nouveau,
  );
  await attendreAuDessus(nouveau, page.getByText(AIDE_MOT_DE_PASSE));

  await nouveau.fill("un-mot-de-passe");
  await confirmation.fill("un-autre-mot-de-passe");
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();

  const erreur = page
    .getByRole("alert")
    .filter({ hasText: "Les deux mots de passe ne sont pas identiques." });
  await expect(erreur).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await expect(confirmation).toHaveAccessibleDescription(
    "Les deux mots de passe ne sont pas identiques.",
  );
  await attendreAuDessus(confirmation, erreur);
  await attendreAuDessus(
    erreur,
    page.getByRole("button", { name: "Enregistrer le mot de passe" }),
  );
});

async function attendreAuDessus(haut: Locator, bas: Locator) {
  const a = (await haut.boundingBox())!;
  const b = (await bas.boundingBox())!;
  expect(a.y + a.height).toBeLessThanOrEqual(b.y);
}

/** Un résident demande un nouveau mot de passe et ouvre le lien reçu : la page a une session. */
async function ouvrirLeLienDuNouveauMotDePasse(page: Page) {
  const resident = await nouveauResident();
  emails.push(resident.email);

  await page.goto("/mot-de-passe-oublie");
  await page.getByLabel("Adresse email").fill(resident.email);
  await page.getByRole("button", { name: "Recevoir un lien" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "un email vient de vous être envoyé",
  );
  await page.goto(await lienRecu(resident.email));
  await expect(page.getByLabel("Nouveau mot de passe")).toBeVisible();
}

async function attendreSansDefilementHorizontal(page: Page) {
  const debordement = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(debordement).toBeLessThanOrEqual(0);
}
