import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouvelleFicheSyndic,
  nouveauResident,
  nouveauSyndic,
  photoJpeg,
  reglerAffichage,
  supprimerComptes,
  supprimerFichesSyndic,
  verifierSansDefilementHorizontal,
} from "./outils";

// Ticket #42 : le conseil syndical tient les fiches de Mon syndic, les résidents les lisent.

const emails: string[] = [];
const prenoms: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerFichesSyndic(prenoms.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

function enregistrer(page: Page) {
  return page.getByRole("button", { name: "Enregistrer", exact: true }).click();
}

/** Les prénoms et noms de la liste de gestion, dans l'ordre où la page les montre. */
function nomsDeLaListe(page: Page) {
  return page
    .getByRole("list", { name: "Fiches de Mon syndic" })
    .getByRole("heading")
    .allTextContents();
}

/** La carte d'une fiche dans Mon syndic (ou dans la liste de gestion), retrouvée par son titre. */
function carte(page: Page, nom: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: nom }) });
}

test("le conseil syndical ajoute deux fiches et les ordonne, un résident les lit dans Mon syndic", async ({
  page,
  browser,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const suffixe = randomUUID().slice(0, 6);
  const nadia = `Nadia ${suffixe}`;
  const paul = `Paul ${suffixe}`;
  prenoms.push(nadia, paul);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/mon-syndic");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mon syndic" }),
  ).toBeVisible();

  // Une première fiche complète : les erreurs d'abord, puis la photo, puis l'enregistrement.
  await page.getByRole("link", { name: "Ajouter une fiche" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Ajouter une fiche" }),
  ).toBeVisible();
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Saisissez le prénom.",
  );
  await page.getByLabel("Prénom", { exact: true }).fill(nadia);
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Saisissez le nom.",
  );
  await page.getByLabel("Nom", { exact: true }).fill("Benali");
  await page.getByLabel("Téléphone").fill("appelez-moi");
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Saisissez un numéro de téléphone",
  );
  await page.getByLabel("Téléphone").fill("01 23 45 67 89");
  await page.getByLabel("E-mail").fill("nadia@cabinet");
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Saisissez une adresse email complète",
  );
  await page.getByLabel("E-mail").fill("nadia.benali@cabinet-exemple.fr");
  await page.getByLabel("Photo", { exact: true }).setInputFiles({
    name: "nadia.jpg",
    mimeType: "image/jpeg",
    buffer: await photoJpeg("#0d3b66", 1600, 1200),
  });
  await expect(page.getByRole("main")).toContainText(
    "Voici la photo que les résidents verront.",
  );
  await page.screenshot({
    path: test.info().outputPath("formulaire-fiche.png"),
    fullPage: true,
  });
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `La fiche de ${nadia} Benali est ajoutée à Mon syndic.`,
  );

  // La seconde, sans coordonnées, reliée au compte du conseil syndical connecté.
  await page.getByRole("link", { name: "Ajouter une fiche" }).click();
  await page.getByLabel("Prénom", { exact: true }).fill(paul);
  await page.getByLabel("Nom", { exact: true }).fill("Moreau");
  await page
    .getByLabel("Compte dans l'espace syndic")
    .selectOption({ value: syndic.id });
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `La fiche de ${paul} Moreau est ajoutée à Mon syndic.`,
  );
  await expect(carte(page, `${paul} Moreau`)).toContainText("Sur coMunity");
  await expect(carte(page, `${nadia} Benali`)).not.toContainText(
    "Sur coMunity",
  );

  // La remontée d'un cran : Paul passe avant Nadia. Le projet mobile et le projet desktop écrivent
  // dans la même base : la voisine du dessus peut être la fiche de l'autre, on remonte jusqu'à
  // passer avant Nadia.
  let ordre = await nomsDeLaListe(page);
  expect(ordre.indexOf(`${nadia} Benali`)).toBeLessThan(
    ordre.indexOf(`${paul} Moreau`),
  );
  for (let essai = 0; essai < 10; essai++) {
    const place = ordre.indexOf(`${paul} Moreau`);
    if (place < ordre.indexOf(`${nadia} Benali`)) break;
    // Le clic peut précéder l'hydratation de la page, qui vient de s'ouvrir : on le rejoue.
    await expect(async () => {
      await page
        .getByRole("button", { name: `Monter : ${paul} Moreau` })
        .click({ timeout: 2000 });
      await expect
        .poll(
          async () => (await nomsDeLaListe(page)).indexOf(`${paul} Moreau`),
          { timeout: 3000 },
        )
        .toBeLessThan(place);
    }).toPass({ timeout: 20_000 });
    ordre = await nomsDeLaListe(page);
  }
  expect(ordre.indexOf(`${paul} Moreau`)).toBeLessThan(
    ordre.indexOf(`${nadia} Benali`),
  );
  await page.screenshot({
    path: test.info().outputPath("liste-fiches.png"),
    fullPage: true,
  });

  // Un résident lit Mon syndic, depuis le menu de son avatar.
  const {
    baseURL,
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
  } = test.info().project.use;
  const contexte = await browser.newContext({
    baseURL,
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
    locale: "fr-FR",
  });
  const lecteur = await contexte.newPage();
  try {
    await seConnecter(lecteur, resident.email);
    await lecteur.getByRole("button", { name: "Mon profil" }).click();
    await lecteur
      .getByRole("dialog", { name: "Menu du profil" })
      .getByRole("link", { name: /^Mon syndic/ })
      .click();
    await expect(
      lecteur.getByRole("heading", { level: 1, name: "Mon syndic" }),
    ).toBeVisible();

    const carteNadia = carte(lecteur, `${nadia} Benali`);
    await expect(
      carteNadia.getByRole("link", { name: /01 23 45 67 89/ }),
    ).toHaveAttribute("href", "tel:0123456789");
    await expect(
      carteNadia.getByRole("link", {
        name: /nadia\.benali@cabinet-exemple\.fr/,
      }),
    ).toHaveAttribute("href", "mailto:nadia.benali@cabinet-exemple.fr");
    await expect(carteNadia).not.toContainText("Sur coMunity");
    // La photo est servie par une adresse signée : le bucket est privé.
    const photo = carteNadia.locator("img");
    await expect(photo).toHaveAttribute("src", /\/object\/sign\/syndic\//);
    await expect
      .poll(() => photo.evaluate((i) => (i as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    // Envoyée en 1600 px de large, la photo a été réduite dans le navigateur avant son dépôt.
    expect(
      await photo.evaluate((i) => (i as HTMLImageElement).naturalWidth),
    ).toBeLessThanOrEqual(1280);

    // Paul n'a ni photo, ni coordonnées : son initiale, et la mention Sur coMunity.
    const cartePaul = carte(lecteur, `${paul} Moreau`);
    await expect(cartePaul).toContainText("Sur coMunity");
    await expect(cartePaul).toContainText("P");
    await expect(cartePaul.getByRole("link")).toHaveCount(0);
    await expect(cartePaul.locator("img")).toHaveCount(0);

    // Les cibles d'appel et d'envoi font au moins 52 px de haut.
    for (const lien of [
      carteNadia.getByRole("link", { name: /01 23 45 67 89/ }),
      carteNadia.getByRole("link", { name: /nadia\.benali@/ }),
    ]) {
      const boite = await lien.boundingBox();
      expect(boite?.height ?? 0).toBeGreaterThanOrEqual(52);
    }
    await lecteur.screenshot({
      path: test.info().outputPath("mon-syndic.png"),
      fullPage: true,
    });
  } finally {
    await contexte.close();
  }
});

test("le conseil syndical modifie puis supprime une fiche, après confirmation", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const fiche = await nouvelleFicheSyndic({ telephone: "0612345678" });
  const nouveauPrenom = `${fiche.prenom} bis`;
  prenoms.push(fiche.prenom, nouveauPrenom);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/mon-syndic");
  await page
    .getByRole("link", { name: `Modifier : ${fiche.prenom} ${fiche.nom}` })
    .click();
  await expect(page.getByLabel("Prénom", { exact: true })).toHaveValue(
    fiche.prenom,
  );
  await expect(page.getByLabel("Téléphone")).toHaveValue("0612345678");
  await page.getByLabel("Prénom", { exact: true }).fill(nouveauPrenom);
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `La fiche de ${nouveauPrenom} ${fiche.nom} est enregistrée.`,
  );

  await page
    .getByRole("link", { name: `Modifier : ${nouveauPrenom} ${fiche.nom}` })
    .click();
  await page.getByRole("button", { name: "Supprimer la fiche" }).click();
  const feuille = page.getByRole("dialog", { name: "Supprimer cette fiche ?" });
  await expect(feuille).toContainText("Cette action est définitive.");
  await feuille.getByRole("button", { name: "Garder la fiche" }).click();
  await expect(feuille).toBeHidden();
  await page.getByRole("button", { name: "Supprimer la fiche" }).click();
  await feuille.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `La fiche de ${nouveauPrenom} ${fiche.nom} est supprimée.`,
  );
  await expect(
    page.getByRole("link", {
      name: `Modifier : ${nouveauPrenom} ${fiche.nom}`,
    }),
  ).toHaveCount(0);
});

test("un résident n'entre pas dans la gestion de Mon syndic", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/syndic/mon-syndic");

  await expect(page.getByRole("main")).toContainText(
    "Cet espace est réservé aux membres du conseil syndical.",
  );
});

test("un résident en attente de validation lit Mon syndic", async ({
  page,
}) => {
  const resident = await nouveauResident("en_attente");
  emails.push(resident.email);
  const fiche = await nouvelleFicheSyndic({ email: "marc@cabinet-exemple.fr" });
  prenoms.push(fiche.prenom);

  await seConnecter(page, resident.email);
  await page.goto("/mon-syndic");

  await expect(
    carte(page, `${fiche.prenom} ${fiche.nom}`).getByRole("link", {
      name: /marc@cabinet-exemple\.fr/,
    }),
  ).toHaveAttribute("href", "mailto:marc@cabinet-exemple.fr");
});

test("un résident refusé ne lit pas Mon syndic", async ({ page }) => {
  const resident = await nouveauResident("refuse");
  emails.push(resident.email);
  const fiche = await nouvelleFicheSyndic();
  prenoms.push(fiche.prenom);

  await seConnecter(page, resident.email);
  await page.goto("/mon-syndic");

  await expect(page.getByRole("main")).toContainText("Compte non accepté");
  await expect(page.getByRole("main")).not.toContainText(fiche.prenom);
});

test("un visiteur est conduit à la connexion avant de lire Mon syndic", async ({
  page,
}) => {
  await page.goto("/mon-syndic");

  await expect(page).toHaveURL(/\/connexion\?suivant=%2Fmon-syndic/);
});

/** Trois fiches complètes, lues par un résident sur Mon syndic ; renvoie les cartes dans l'ordre. */
async function lireTroisFiches(page: Page) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const suffixe = randomUUID().slice(0, 6);
  const noms: string[] = [];
  for (const [i, prenom] of ["Claire", "Marc", "Nadia"].entries()) {
    const fiche = await nouvelleFicheSyndic({
      prenom: `${prenom} ${suffixe}`,
      nom: "Benali",
      telephone: `01 23 45 67 8${i}`,
      email: `${prenom.toLowerCase()}@cabinet-exemple.fr`,
    });
    prenoms.push(fiche.prenom);
    noms.push(`${fiche.prenom} ${fiche.nom}`);
  }
  await seConnecter(page, resident.email);
  await page.goto("/mon-syndic");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mon syndic" }),
  ).toBeVisible();
  return noms.map((nom) => carte(page, nom));
}

/** Les positions à gauche des cartes de la liste, sans doublon : une par colonne. */
async function colonnes(page: Page) {
  const gauches = await page
    .getByRole("list", { name: "Personnes du syndic" })
    .locator("> li")
    .evaluateAll((cartes) =>
      cartes.map((c) => Math.round(c.getBoundingClientRect().left)),
    );
  return [...new Set(gauches)];
}

test("sur ordinateur, les contacts sont en grille de trois colonnes avec « Appeler » et « Écrire »", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "présentation Journal");
  const cartes = await lireTroisFiches(page);

  // Les projets mobile et desktop partagent la base : d'autres fiches peuvent s'intercaler, seul le
  // nombre de colonnes est stable.
  expect(await colonnes(page)).toHaveLength(3);
  const claire = cartes[0];
  const appeler = claire.getByRole("link", { name: /^Appeler/ });
  const ecrire = claire.getByRole("link", { name: /^Écrire/ });
  await expect(appeler).toHaveAttribute("href", "tel:0123456780");
  await expect(ecrire).toHaveAttribute(
    "href",
    "mailto:claire@cabinet-exemple.fr",
  );
  for (const lien of [appeler, ecrire]) {
    expect((await lien.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(52);
  }
  // Les coordonnées restent lisibles en clair, à côté des boutons.
  await expect(claire).toContainText("01 23 45 67 80");
  await expect(claire).toContainText("claire@cabinet-exemple.fr");
  // Aucun encart de message au conseil syndical.
  await expect(page.getByRole("main")).not.toContainText(
    "Une question pour le conseil syndical",
  );
  await verifierSansDefilementHorizontal(page);
  await page.screenshot({
    path: info.outputPath("mon-syndic-ordinateur.png"),
    fullPage: true,
  });
});

test("sur ordinateur, les cartes de Mon syndic n'ont pas de contour et ne bougent plus quand les animations sont réduites", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "présentation Journal");
  const [claire] = await lireTroisFiches(page);
  const carteClaire = claire.first();
  const style = (propriete: string) =>
    carteClaire.evaluate(
      (el, p) => getComputedStyle(el).getPropertyValue(p),
      propriete,
    );

  expect(await style("border-top-color")).toBe("rgba(0, 0, 0, 0)");
  expect(await style("box-shadow")).not.toBe("none");
  expect(parseFloat(await style("transition-duration"))).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await style("transition-duration")).toBe("0s");
});

test("sur mobile, les contacts restent en une seule colonne, avec leurs coordonnées en boutons", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "mise en page mobile inchangée");
  const [claire] = await lireTroisFiches(page);

  expect(await colonnes(page)).toHaveLength(1);
  await expect(
    claire.getByRole("link", { name: /01 23 45 67 80/ }),
  ).toBeVisible();
  await expect(claire.getByRole("link", { name: /^Appeler/ })).toHaveCount(0);
  await verifierSansDefilementHorizontal(page);
});

for (const theme of ["clair", "sombre"] as const) {
  test(`Mon syndic est accessible en grands caractères et en thème ${theme}`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const fiche = await nouvelleFicheSyndic({
      telephone: "01 23 45 67 89",
      email: "marc.lefevre@cabinet-exemple.fr",
    });
    prenoms.push(fiche.prenom);
    await reglerAffichage(resident.id, { theme, taille: "grands" });

    await seConnecter(page, resident.email);
    await page.goto("/mon-syndic");
    await expect(
      page.getByRole("heading", { name: `${fiche.prenom} ${fiche.nom}` }),
    ).toBeVisible();

    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);
    await verifierSansDefilementHorizontal(page);
    await page.screenshot({
      path: test.info().outputPath(`mon-syndic-${theme}-grands.png`),
      fullPage: true,
    });
  });
}
