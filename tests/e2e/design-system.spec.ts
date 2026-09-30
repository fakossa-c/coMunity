import { expect, test, type Locator, type Page } from "@playwright/test";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "../../src/lib/mot-de-passe";
import {
  MOT_DE_PASSE,
  inscrireResident,
  lienRecu,
  nouveauResident,
  nouvelleActivite,
  nouvelleActiviteEnTete,
  supprimerComptes,
  titreAccueil,
} from "./outils";

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

test.describe("couleur d'une catégorie d'activité", () => {
  // Les pastels et leurs encres, écrits en dur : ce que l'utilisateur voit à l'écran.
  const CULTURE = { fond: "rgb(226, 220, 255)", encre: "rgb(29, 15, 77)" };
  const JARDIN = { fond: "rgb(192, 236, 227)", encre: "rgb(0, 32, 27)" };

  async function seConnecter(page: Page, email: string) {
    await page.goto("/connexion");
    await page.getByLabel("Adresse email").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(titreAccueil(page)).toBeVisible();
  }

  async function preparer(page: Page) {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const suffixe = Date.now();
    const dans3Jours = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const culture = {
      titre: `Ciné-club ${suffixe}`,
      identifiant: await nouvelleActivite(resident.id, {
        titre: `Ciné-club ${suffixe}`,
        categorie: "culture_loisirs",
        pictogramme: "menu_book",
        date_activite: dans3Jours,
      }),
    };
    const jardin = {
      titre: `Bouturage ${suffixe}`,
      identifiant: await nouvelleActivite(resident.id, {
        titre: `Bouturage ${suffixe}`,
        categorie: "jardin_nature",
        pictogramme: "potted_plant",
        date_activite: dans3Jours,
      }),
    };
    await inscrireResident(culture.identifiant, resident.id);
    await inscrireResident(jardin.identifiant, resident.id);
    // Une activité plus proche prend « À la une » : les deux du test restent dans la grille.
    await nouvelleActiviteEnTete(resident.id);
    await seConnecter(page, resident.email);
    return { culture, jardin };
  }

  async function verifierCouleurs(
    cible: Locator,
    couleur: { fond: string; encre: string },
  ) {
    expect(await styleCalcule(cible, "background-color")).toBe(couleur.fond);
    expect(await styleCalcule(cible, "color")).toBe(couleur.encre);
  }

  test("l'Accueil colore le visuel et le pictogramme de chaque carte selon sa catégorie", async ({
    page,
  }) => {
    const { culture, jardin } = await preparer(page);
    const catalogue = page.getByRole("region", { name: "Activités à venir" });
    for (const [activite, libelle, couleur] of [
      [culture, "Culture & Loisirs", CULTURE],
      [jardin, "Jardin & Nature", JARDIN],
    ] as const) {
      const carte = catalogue
        .getByRole("article")
        .filter({ hasText: activite.titre });
      await verifierCouleurs(carte.locator("> div").first(), couleur);
      await verifierCouleurs(
        carte.locator("p", { hasText: libelle }).locator("span").first(),
        couleur,
      );
    }
  });

  test("Activités › J'y vais colore la pastille de chaque carte selon sa catégorie", async ({
    page,
  }) => {
    const { culture, jardin } = await preparer(page);
    await page.goto("/activites");
    for (const [activite, couleur] of [
      [culture, CULTURE],
      [jardin, JARDIN],
    ] as const) {
      const carte = page
        .getByRole("article")
        .filter({ hasText: activite.titre });
      await verifierCouleurs(carte.locator("> div > span").first(), couleur);
    }
  });

  test("la fiche d'une activité sans photo colore son visuel, en thème sombre aussi", async ({
    page,
  }) => {
    const { culture } = await preparer(page);
    await page.goto(`/activites/${culture.identifiant}`);
    const visuel = page.getByRole("main").locator("article > div").first();
    await verifierCouleurs(visuel, CULTURE);

    await poserSurLaRacine(page, "data-theme", "sombre");
    await verifierCouleurs(visuel, CULTURE);
  });
});
