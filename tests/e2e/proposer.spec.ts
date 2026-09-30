import { expect, test, type Page } from "@playwright/test";
import {
  choisirDate,
  continuerProposer,
  encartAssistant,
  estBureau,
  etapeProposer,
  MOT_DE_PASSE,
  nouveauResident,
  nouvelEspaceCommun,
  nouvelleActiviteEnTete,
  reglerAffichage,
  saisirLieuLibre,
  supprimerComptes,
  supprimerEspacesCommuns,
  verifierSansDefilementHorizontal,
} from "./outils";

// Ticket #9 : le parcours de création en 4 étapes, du bouton « Proposer » à la fiche publiée.

const emails: string[] = [];
const espaces: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerEspacesCommuns(espaces.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

function dansUnMois() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function etape(page: Page, numero: number) {
  return expect(page.getByRole("main")).toContainText(`Étape ${numero} sur 4`);
}

function continuer(page: Page) {
  return page.getByRole("button", { name: "Continuer" }).click();
}

/** Remplit les trois étapes de saisie et s'arrête sur le récapitulatif. */
async function saisirJusquAuRecapitulatif(page: Page, titre: string) {
  await etape(page, 1);
  await page.getByLabel("Titre de l'activité").fill(titre);
  await page.getByLabel("Catégorie").selectOption({ label: "Jardin & Nature" });
  await page
    .getByLabel("Mot d'accueil")
    .fill("Venez comme vous êtes, seul ou en famille.");
  await continuer(page);

  await etape(page, 2);
  await choisirDate(page, dansUnMois());
  await page.getByLabel("Heure de début").selectOption("10:00");
  await page.getByLabel("Heure de fin").selectOption("11:30");
  await saisirLieuLibre(page, "Cour intérieure");
  await page
    .getByLabel("Précision d'accès")
    .fill("Par le portail vert, au fond de la cour.");
  await continuer(page);

  await etape(page, 3);
  await page.getByRole("radio", { name: "Limité", exact: true }).check();
  await page.getByLabel("Nombre de places").fill("12");
  await page.getByLabel("Minimum de participants").fill("4");
  await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
  await page.getByRole("checkbox", { name: "Enfants bienvenus" }).check();
  await page
    .getByLabel("Conseils pratiques")
    .fill("Prévoyez une petite laine.");
  await page.getByLabel("Matériel à prévoir").fill("Gants fournis.");
  await page
    .getByLabel("Ce que vous pouvez apporter")
    .fill("Vos épluchures de la semaine.");
  await continuer(page);

  await etape(page, 4);
}

test("sur mobile, un résident propose une activité en quatre étapes, sans perdre sa saisie", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Parcours en étapes du mobile : la page unique de l'ordinateur a ses propres tests.",
  );
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const titre = `Atelier compost ${Date.now()}`;
  // Une activité plus proche prend « À la une » : celle du test s'affiche dans la grille, avec ses étiquettes.
  await nouvelleActiviteEnTete(resident.id);

  await seConnecter(page, resident.email);
  await page.goto("/activites");
  // Le bouton flottant du mobile, ou « Proposer » de la barre du haut sur ordinateur.
  await page.getByRole("link", { name: "Proposer" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();

  // Étape 1 : le titre se compte, un titre vide ne passe pas.
  await etape(page, 1);
  await expect(page.getByRole("main")).toContainText(
    "Titre, catégorie et photos",
  );
  await continuer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Donnez un titre",
  );
  await page.getByLabel("Titre de l'activité").fill("Atelier");
  await expect(page.getByRole("main")).toContainText("7 / 50");
  await page.getByLabel("Titre de l'activité").fill(titre);
  await page.getByLabel("Catégorie").selectOption({ label: "Jardin & Nature" });
  await page.getByLabel("Mot d'accueil").fill("Venez comme vous êtes.");
  await expect(page.getByRole("main")).toContainText("22 / 300");
  await continuer(page);

  // Étape 2 : sans date ni heures choisies, chaque champ le dit ; un jour se touche au calendrier,
  // les heures se choisissent dans des listes et la fin suit le début.
  await etape(page, 2);
  await saisirLieuLibre(page, "Cour intérieure");
  await continuer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choisissez une date.",
  );
  await choisirDate(page, dansUnMois());
  await continuer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Indiquez l'heure de début.",
  );
  const debut = page.getByLabel("Heure de début");
  const fin = page.getByLabel("Heure de fin");
  await debut.selectOption("10:00");
  await expect(fin).toHaveValue("11:30");
  await expect(debut.locator("option")).toContainText([
    "Choisir l'heure",
    "06h00",
  ]);
  // La fin ne propose que des heures après le début.
  await expect(fin.locator("option[value='10:00']")).toHaveCount(0);
  await expect(fin.locator("option[value='10:15']")).toHaveCount(1);
  await expect(fin.locator("option[value='23:45']")).toHaveCount(1);
  // Une fin choisie reste en place quand le début change sans la dépasser ; sinon elle suit.
  await fin.selectOption("12:00");
  await debut.selectOption("10:30");
  await expect(fin).toHaveValue("12:00");
  await debut.selectOption("12:00");
  await expect(fin).toHaveValue("13:30");
  // La fin recalculée n'est pas un choix : elle suit de nouveau le début.
  await debut.selectOption("14:00");
  await expect(fin).toHaveValue("15:30");
  await debut.selectOption("10:00");
  await fin.selectOption("11:30");
  await page.getByLabel("Précision d'accès").fill("Par le portail vert.");
  await expect(page.getByRole("main")).toContainText("20 / 120");
  await continuer(page);

  // Étape 3 : places limitées, minimum sous le maximum, deux étiquettes.
  await etape(page, 3);
  await expect(page.getByLabel("Nombre de places")).toHaveCount(0);
  await page.getByRole("radio", { name: "Limité", exact: true }).check();
  await page.getByLabel("Nombre de places").fill("12");
  await page.getByLabel("Minimum de participants").fill("20");
  await continuer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Le minimum ne peut pas dépasser le nombre de places.",
  );
  await page.getByLabel("Minimum de participants").fill("4");
  await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
  await page.getByRole("checkbox", { name: "Enfants bienvenus" }).check();
  await page
    .getByLabel("Conseils pratiques")
    .fill("Prévoyez une petite laine.");

  // Précédent puis Continuer : rien n'est perdu, dans un sens comme dans l'autre.
  await page.getByRole("button", { name: "Précédent", exact: true }).click();
  await etape(page, 2);
  await expect(page.getByLabel("Nom du lieu")).toHaveValue("Cour intérieure");
  await continuer(page);
  await etape(page, 3);
  await expect(page.getByLabel("Nombre de places")).toHaveValue("12");
  await expect(
    page.getByRole("checkbox", { name: "Accès plain-pied" }),
  ).toBeChecked();
  await page.getByLabel("Matériel à prévoir").fill("Gants fournis.");
  await page
    .getByLabel("Ce que vous pouvez apporter")
    .fill("Vos épluchures de la semaine.");
  await page.screenshot({
    path: test.info().outputPath("etape-3.png"),
    fullPage: true,
  });
  await continuer(page);

  // Étape 4 : tout est repris, chaque bloc ramène à son étape, l'assistant a son encart.
  await etape(page, 4);
  const recapitulatif = page.getByRole("main");
  await expect(recapitulatif).toContainText(titre);
  await expect(recapitulatif).toContainText("Jardin & Nature");
  await expect(recapitulatif).toContainText("Venez comme vous êtes.");
  await expect(recapitulatif).toContainText("de 10h00 à 11h30");
  await expect(recapitulatif).toContainText("Cour intérieure");
  await expect(recapitulatif).toContainText("Par le portail vert.");
  await expect(recapitulatif).toContainText("12 places");
  await expect(recapitulatif).toContainText("4 participants");
  await expect(recapitulatif).toContainText("Accès plain-pied");
  await expect(recapitulatif).toContainText("Enfants bienvenus");
  await expect(recapitulatif).toContainText("Prévoyez une petite laine.");
  await expect(recapitulatif).toContainText("Gants fournis.");
  await expect(recapitulatif).toContainText("Vos épluchures de la semaine.");
  await expect(recapitulatif).toContainText("Conseils de l'assistant");
  await expect(recapitulatif).not.toContainText("%");
  await page.screenshot({
    path: test.info().outputPath("recapitulatif.png"),
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "Modifier : Titre, catégorie et photos" })
    .click();
  await etape(page, 1);
  await expect(page.getByLabel("Titre de l'activité")).toHaveValue(titre);
  // Depuis le récapitulatif, « Continuer » y ramène sans repasser par les autres étapes.
  await continuer(page);
  await etape(page, 4);

  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  // La fiche reprend le mot d'accueil, les étiquettes et les trois textes.
  await page.getByRole("link", { name: "Voir la fiche" }).click();
  const fiche = page.getByRole("main");
  await expect(fiche).toContainText("Venez comme vous êtes.");
  await expect(fiche).toContainText("Par le portail vert.");
  await expect(fiche).toContainText("Accès plain-pied");
  await expect(fiche).toContainText("Enfants bienvenus");
  await expect(fiche).toContainText("Au moins 4 participants");
  await expect(fiche).toContainText("Conseils pratiques");
  await expect(fiche).toContainText("Prévoyez une petite laine.");
  await expect(fiche).toContainText("Matériel à prévoir");
  await expect(fiche).toContainText("Gants fournis.");
  await expect(fiche).toContainText("Ce que vous pouvez apporter");
  await expect(fiche).toContainText("Vos épluchures de la semaine.");
  await expect(fiche).toContainText("sur 12 places");
  await page.screenshot({
    path: test.info().outputPath("fiche-complete.png"),
    fullPage: true,
  });

  // La carte du catalogue porte les étiquettes.
  await page.goto("/");
  const carte = page
    .getByRole("region", { name: "Activités à venir" })
    .getByRole("listitem")
    .filter({ hasText: titre });
  await expect(carte).toContainText("Accès plain-pied");
  await expect(carte).toContainText("Enfants bienvenus");
});

test("sur mobile, le minimum de participants démarre à 1, et les conseils de l'assistant ouvrent le récapitulatif", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Parcours en étapes du mobile : la page unique de l'ordinateur a ses propres tests.",
  );
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const titre = `Café des voisins ${Date.now()}`;

  await seConnecter(page, resident.email);
  await page.goto("/proposer");
  await etape(page, 1);
  await page.getByLabel("Titre de l'activité").fill(titre);
  await continuer(page);
  await etape(page, 2);
  await choisirDate(page, dansUnMois());
  await page.getByLabel("Heure de début").selectOption("10:00");
  await saisirLieuLibre(page, "Cour intérieure");
  await continuer(page);

  // Un minimum de 1 est déjà là ; le vider reste permis : « Aucun minimum ».
  await etape(page, 3);
  const minimum = page.getByLabel("Minimum de participants");
  await expect(minimum).toHaveValue("1");
  await minimum.fill("");
  await continuer(page);
  await etape(page, 4);
  await expect(page.getByRole("main")).toContainText("Aucun minimum");
  await page
    .getByRole("button", { name: "Modifier : Capacité et confort" })
    .click();
  await etape(page, 3);
  await minimum.fill("1");
  await continuer(page);

  // L'encart de l'assistant est sous le titre de l'étape, au-dessus des cartes, sans défiler.
  await etape(page, 4);
  const encart = encartAssistant(page);
  const premiereCarte = page.getByRole("heading", {
    name: "Titre, catégorie et photos",
  });
  await expect(encart).toBeVisible();
  const [haut, carte, fenetre] = await Promise.all([
    encart.boundingBox(),
    premiereCarte.boundingBox(),
    page.evaluate(() => window.innerHeight),
  ]);
  expect(haut!.y).toBeLessThan(carte!.y);
  expect(haut!.y).toBeLessThan(fenetre);
  await expect(page.getByRole("main")).toContainText("Au moins 1 participant");
  await page.screenshot({
    path: test.info().outputPath("recapitulatif-encart-en-haut.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Publier" }).click();

  // Un minimum de 1 ne demande rien de plus : la fiche ne parle ni de minimum ni de participants
  // manquants.
  await page.getByRole("link", { name: "Voir la fiche" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: titre }),
  ).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("Au moins 1");
  await expect(page.getByRole("main")).not.toContainText(
    "Encore 1 participant pour confirmer",
  );
});

test("sur mobile, « Annuler la proposition » ne publie rien", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Parcours en étapes du mobile : la page unique de l'ordinateur a ses propres tests.",
  );
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const titre = `Brouillon ${Date.now()}`;

  await seConnecter(page, resident.email);
  await page.goto("/proposer");
  await saisirJusquAuRecapitulatif(page, titre);

  await page.getByRole("button", { name: "Annuler la proposition" }).click();

  await expect(page).toHaveURL(/\/activites$/);
  await page.goto("/");
  await expect(page.getByRole("main")).not.toContainText(titre);
});

test("le parcours reste en pêche et sans pourcentage sur le plus petit téléphone", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Le parcours est conçu mobile d'abord.");
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/proposer");
  await etape(page, 1);

  // La barre d'action tient dans l'écran : « Continuer » ne dépasse pas à droite.
  const bouton = await page
    .getByRole("button", { name: "Continuer" })
    .boundingBox();
  expect(bouton!.x + bouton!.width).toBeLessThanOrEqual(360);
  await page.screenshot({
    path: test.info().outputPath("etape-1-360.png"),
    fullPage: true,
  });
});

// Ticket #133 : sur ordinateur, Proposer est une page unique avec un aperçu vivant de la carte ;
// le mobile garde ses étapes. Le champ « Description » existe dans les deux présentations.

const BLOCS = [
  "Titre et description",
  "Catégorie",
  "Photos",
  "Date et heure",
  "Lieu",
  "Précisions",
];

function colonneDroite(page: Page) {
  return page.getByRole("complementary", { name: "Aperçu et publication" });
}

function apercu(page: Page) {
  return colonneDroite(page).getByRole("article", {
    name: "Aperçu de la carte de l'activité",
  });
}

/** Un résident validé, connecté, sur Proposer. */
async function ouvrirProposer(page: Page, adresse = "/proposer") {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await page.goto(adresse);
  return resident;
}

/** Remplit ce qu'il faut pour publier, sur les étapes du mobile comme sur la page de l'ordinateur. */
async function remplirLeNecessaire(
  page: Page,
  titre: string,
  description?: string,
) {
  await etapeProposer(page, 1);
  await page.getByLabel("Titre de l'activité").fill(titre);
  if (description !== undefined)
    await page.getByLabel("Description", { exact: true }).fill(description);
  await continuerProposer(page);
  await etapeProposer(page, 2);
  await choisirDate(page, dansUnMois());
  await page.getByLabel("Heure de début").selectOption("10:00");
  await saisirLieuLibre(page, "Cour intérieure");
  await continuerProposer(page);
  await etapeProposer(page, 3);
  await continuerProposer(page);
  await etapeProposer(page, 4);
}

test.describe("sur ordinateur : une page unique", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Sur mobile, Proposer garde son parcours en étapes.",
  );

  test("six blocs, plus d'étapes, et une colonne à droite qui reste visible", async ({
    page,
  }) => {
    await ouvrirProposer(page);
    const principal = page.getByRole("main");

    for (const bloc of BLOCS)
      await expect(
        principal.getByRole("heading", { level: 2, name: bloc, exact: true }),
      ).toBeVisible();
    await expect(page.getByText("Étape 1 sur 4")).toBeHidden();
    await expect(page.getByRole("button", { name: "Continuer" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Précédent", exact: true }),
    ).toHaveCount(0);

    // La colonne : aperçu de la carte, « Il reste à remplir », « Publier l'activité ».
    const colonne = colonneDroite(page);
    await expect(apercu(page)).toBeVisible();
    await expect(
      colonne.getByRole("heading", { name: "Il reste à remplir" }),
    ).toBeVisible();
    await expect(
      colonne.getByRole("button", { name: "Publier l'activité" }),
    ).toBeVisible();
    // L'assistant est en haut, au-dessus des blocs.
    const encart = encartAssistant(page);
    await expect(encart).toBeVisible();
    const [haut, premierBloc] = await Promise.all([
      encart.boundingBox(),
      principal
        .getByRole("heading", { level: 2, name: "Titre et description" })
        .boundingBox(),
    ]);
    expect(haut!.y).toBeLessThan(premierBloc!.y);
    // Ni la barre du bas ni la barre d'action fixe du mobile.
    await expect(page.getByRole("button", { name: "Publier" })).toHaveCount(1);
    await page.screenshot({
      path: test.info().outputPath("page-unique-vide.png"),
      fullPage: true,
    });

    // La colonne colle en haut quand la page défile.
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const collee = await colonne.boundingBox();
    expect(collee!.y).toBeGreaterThanOrEqual(0);
    expect(collee!.y).toBeLessThan(120);
    // Même en bas de page, on peut atteindre « Publier l'activité ».
    await colonne
      .getByRole("button", { name: "Publier l'activité" })
      .scrollIntoViewIfNeeded();
    const bouton = await colonne
      .getByRole("button", { name: "Publier l'activité" })
      .boundingBox();
    expect(bouton!.y + bouton!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
    await page.screenshot({
      path: test.info().outputPath("page-unique-bas.png"),
    });
  });

  test("l'aperçu et « Il reste à remplir » suivent la saisie", async ({
    page,
  }) => {
    await ouvrirProposer(page);
    const colonne = colonneDroite(page);
    const reste = colonne.getByRole("listitem");
    await expect(apercu(page)).toContainText("Le titre de votre activité");
    await expect(reste.filter({ hasText: "Titre" })).toContainText("à saisir");
    await expect(reste.filter({ hasText: "Date et heure" })).toContainText(
      "à choisir",
    );
    // Sans espace commun dans la résidence, le lieu est d'emblée « Autre lieu » : il reste à le nommer.
    await expect(reste.filter({ hasText: "Lieu" })).toContainText(
      /à (choisir|nommer)/,
    );
    await expect(reste.filter({ hasText: "Description" })).toContainText(
      "conseillée",
    );

    await page.getByLabel("Titre de l'activité").fill("Goûter d'automne");
    await expect(apercu(page)).toContainText("Goûter d'automne");
    await expect(reste.filter({ hasText: "Titre" })).not.toContainText(
      "à saisir",
    );
    await page
      .getByLabel("Description", { exact: true })
      .fill("Crêpes et jeux de société pour tous.");
    await expect(apercu(page)).toContainText(
      "Crêpes et jeux de société pour tous.",
    );
    await expect(reste.filter({ hasText: "Description" })).not.toContainText(
      "conseillée",
    );

    await page
      .getByLabel("Catégorie")
      .selectOption({ label: "Jardin & Nature" });
    await expect(apercu(page)).toContainText("Jardin & Nature");
    await choisirDate(page, dansUnMois());
    await page.getByLabel("Heure de début").selectOption("10:00");
    await page.getByLabel("Heure de fin").selectOption("11:30");
    await expect(apercu(page)).toContainText("De 10h00 à 11h30");
    await expect(reste.filter({ hasText: "Date et heure" })).not.toContainText(
      "à choisir",
    );
    await saisirLieuLibre(page, "Cour intérieure");
    await expect(apercu(page)).toContainText("Cour intérieure");
    await page.getByRole("radio", { name: "Limité", exact: true }).check();
    await page.getByLabel("Nombre de places").fill("12");
    await expect(apercu(page)).toContainText("12 personnes");
    await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
    await expect(apercu(page)).toContainText("Accès plain-pied");

    await expect(
      colonne.getByRole("heading", { name: "Tout est rempli" }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("page-unique-remplie.png"),
      fullPage: true,
    });
  });

  test("« Publier l'activité » dit ce qui manque, puis publie, description sur la fiche", async ({
    page,
  }) => {
    await ouvrirProposer(page);
    const titre = `Goûter ${Date.now()}`;
    const description = "Crêpes sucrées et salées, jeux de société pour tous.";
    const publier = colonneDroite(page).getByRole("button", {
      name: "Publier l'activité",
    });

    await publier.click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Donnez un titre",
    );
    await page.getByLabel("Titre de l'activité").fill(titre);
    await page.getByLabel("Description", { exact: true }).fill(description);
    await publier.click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Choisissez une date.",
    );
    await choisirDate(page, dansUnMois());
    await page.getByLabel("Heure de début").selectOption("10:00");
    await saisirLieuLibre(page, "Cour intérieure");
    await publier.click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Votre activité est publiée",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Voir la fiche" }).click();
    await expect(page.getByRole("main")).toContainText("Description");
    await expect(page.getByRole("main")).toContainText(description);
  });

  test("un résident propose une activité d'un seul tenant : heures, places, étiquettes, textes, puis la fiche et la carte", async ({
    page,
  }) => {
    const resident = await ouvrirProposer(page);
    const titre = `Atelier compost ${Date.now()}`;
    // Une activité plus proche prend « À la une » : celle du test s'affiche dans la grille.
    await nouvelleActiviteEnTete(resident.id);
    await page.goto("/proposer");

    await page.getByLabel("Titre de l'activité").fill("Atelier");
    await expect(page.getByRole("main")).toContainText("7 / 50");
    await page.getByLabel("Titre de l'activité").fill(titre);
    await page
      .getByLabel("Catégorie")
      .selectOption({ label: "Jardin & Nature" });
    await page.getByLabel("Mot d'accueil").fill("Venez comme vous êtes.");
    await expect(page.getByRole("main")).toContainText("22 / 300");

    // Les heures : la fin suit le début tant que le créateur ne l'a pas choisie.
    await choisirDate(page, dansUnMois());
    const debut = page.getByLabel("Heure de début");
    const fin = page.getByLabel("Heure de fin");
    await debut.selectOption("10:00");
    await expect(fin).toHaveValue("11:30");
    await expect(page.getByRole("main")).toContainText("Durée : 1 h 30");
    await expect(fin.locator("option[value='10:00']")).toHaveCount(0);
    await fin.selectOption("12:00");
    await debut.selectOption("10:30");
    await expect(fin).toHaveValue("12:00");
    await debut.selectOption("10:00");
    await fin.selectOption("11:30");
    await saisirLieuLibre(page, "Cour intérieure");
    await page.getByLabel("Précision d'accès").fill("Par le portail vert.");

    // Les places : un minimum au-dessus du maximum est refusé, sous « Publier l'activité ».
    await expect(page.getByLabel("Minimum de participants")).toHaveValue("1");
    await page.getByRole("radio", { name: "Limité", exact: true }).check();
    await page.getByLabel("Nombre de places").fill("12");
    await page.getByLabel("Minimum de participants").fill("20");
    await colonneDroite(page)
      .getByRole("button", { name: "Publier l'activité" })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Le minimum ne peut pas dépasser le nombre de places.",
    );
    await page.getByLabel("Minimum de participants").fill("4");
    await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
    await page.getByRole("checkbox", { name: "Enfants bienvenus" }).check();
    await page
      .getByLabel("Conseils pratiques")
      .fill("Prévoyez une petite laine.");
    await page.getByLabel("Matériel à prévoir").fill("Gants fournis.");
    await page
      .getByLabel("Ce que vous pouvez apporter")
      .fill("Vos épluchures de la semaine.");
    await expect(apercu(page)).toContainText(
      "Jusqu'à 12 personnes · confirmée dès 4",
    );
    await page.screenshot({
      path: test.info().outputPath("page-unique-complete.png"),
      fullPage: true,
    });

    await colonneDroite(page)
      .getByRole("button", { name: "Publier l'activité" })
      .click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Votre activité est publiée",
      }),
    ).toBeVisible();

    // La fiche reprend tout ce que la page a saisi.
    await page.getByRole("link", { name: "Voir la fiche" }).click();
    const fiche = page.getByRole("main");
    await expect(fiche).toContainText("Venez comme vous êtes.");
    await expect(fiche).toContainText("Par le portail vert.");
    await expect(fiche).toContainText("Accès plain-pied");
    await expect(fiche).toContainText("Enfants bienvenus");
    await expect(fiche).toContainText("Au moins 4 participants");
    await expect(fiche).toContainText("Prévoyez une petite laine.");
    await expect(fiche).toContainText("Gants fournis.");
    await expect(fiche).toContainText("Vos épluchures de la semaine.");
    await expect(fiche).toContainText("sur 12 places");

    // La carte du catalogue porte les étiquettes.
    await page.goto("/");
    const carte = page
      .getByRole("region", { name: "Activités à venir" })
      .getByRole("listitem")
      .filter({ hasText: titre });
    await expect(carte).toContainText("Accès plain-pied");
    await expect(carte).toContainText("Enfants bienvenus");
  });

  test("« Annuler » ne demande confirmation que si quelque chose a été saisi", async ({
    page,
  }) => {
    await ouvrirProposer(page);
    const retour = page
      .getByRole("main")
      .getByRole("link", { name: "Annuler" });

    // Rien de saisi : on part directement.
    await retour.click();
    await expect(page).toHaveURL(/\/activites$/);

    // Une saisie : la confirmation, où l'on peut rester sans rien perdre.
    await page.goto("/proposer");
    await page.getByLabel("Titre de l'activité").fill("Brouillon");
    await retour.click();
    const confirmation = page.getByRole("dialog", {
      name: "Quitter sans publier ?",
    });
    await expect(confirmation).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("confirmation-retour.png"),
    });
    await confirmation.getByRole("button", { name: "Rester ici" }).click();
    await expect(confirmation).toBeHidden();
    await expect(page).toHaveURL(/\/proposer$/);
    await expect(page.getByLabel("Titre de l'activité")).toHaveValue(
      "Brouillon",
    );

    await retour.click();
    await confirmation.getByRole("button", { name: "Quitter" }).click();
    await expect(page).toHaveURL(/\/activites$/);
  });

  test("l'assistant relit la proposition en haut de la page", async ({
    page,
  }) => {
    await ouvrirProposer(page);
    await page.getByLabel("Titre de l'activité").fill("Atelier tricot");
    await choisirDate(page, dansUnMois());
    await page.getByLabel("Heure de début").selectOption("21:00");
    await page.getByLabel("Heure de fin").selectOption("22:30");
    await saisirLieuLibre(page, "Chez Danielle, 2e étage");

    await expect(page.getByRole("main")).toContainText(
      "Votre activité finit après 22h00, l'heure de calme de la résidence",
    );
  });

  test("la préférence de réduction des animations coupe celles de la page", async ({
    page,
  }) => {
    await ouvrirProposer(page);
    await page.getByLabel("Titre de l'activité").fill("Goûter");
    const pastille = page
      .getByRole("main")
      .locator("[data-fait='true']")
      .first();
    await expect(pastille).toBeVisible();
    const duree = () =>
      pastille.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      );
    expect(await duree()).not.toBe("0s");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await duree()).toBe("0s");
  });
});

test("la saisie tient sans barre de défilement horizontale, en clair, en sombre et en grands caractères, sur mobile comme sur ordinateur", async ({
  page,
}) => {
  const resident = await ouvrirProposer(page);
  for (const reglage of [
    { theme: "clair", taille: "standard" },
    { theme: "sombre", taille: "standard" },
    { theme: "clair", taille: "grands" },
  ] as const) {
    await reglerAffichage(resident.id, reglage);
    await page.goto("/proposer");
    await page
      .getByLabel("Titre de l'activité")
      .fill("Un titre d'activité très long pour tenir ".repeat(1));
    await page
      .getByLabel("Description", { exact: true })
      .fill("Une description qui s'étire ".repeat(20));
    // Sur mobile, les étiquettes sont à l'étape 3 : l'étape 1 est déjà bien remplie.
    if (estBureau(page))
      await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
    await verifierSansDefilementHorizontal(page);
    await page.screenshot({
      path: test
        .info()
        .outputPath(`saisie-${reglage.theme}-${reglage.taille}.png`),
      fullPage: true,
    });
  }
});

test.describe("le champ Description, sur mobile comme sur ordinateur", () => {
  test("600 caractères au plus, enregistré, sur la fiche, repris par Modifier et Dupliquer", async ({
    page,
  }) => {
    await ouvrirProposer(page);
    const titre = `Goûter description ${Date.now()}`;
    const description = "Crêpes sucrées et salées, jeux de société pour tous.";
    const champ = page.getByLabel("Description", { exact: true });

    await etapeProposer(page, 1);
    await page.getByLabel("Titre de l'activité").fill(titre);
    await expect(page.getByRole("main")).toContainText("0 / 600 caractères");
    await expect(champ).toHaveAttribute("maxlength", "600");
    // Le navigateur arrête la saisie à 600 caractères ; la validation dit la même limite.
    await champ.fill("x".repeat(600));
    await expect(page.getByRole("main")).toContainText("600 / 600 caractères");

    await champ.fill(description);
    await expect(page.getByRole("main")).toContainText(
      `${description.length} / 600 caractères`,
    );
    await page.screenshot({
      path: test.info().outputPath("description.png"),
      fullPage: true,
    });
    await continuerProposer(page);
    await etapeProposer(page, 2);
    await choisirDate(page, dansUnMois());
    await page.getByLabel("Heure de début").selectOption("10:00");
    await saisirLieuLibre(page, "Cour intérieure");
    await continuerProposer(page);
    await continuerProposer(page);
    await etapeProposer(page, 4);
    await page.getByRole("button", { name: /^Publier/ }).click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Votre activité est publiée",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Voir la fiche" }).click();
    await expect(page.getByRole("main")).toContainText(description);
    const fiche = page.url();

    // Modifier reprend la description ; Dupliquer aussi.
    await page.goto(`${fiche}/modifier`);
    await expect(champ).toHaveValue(description);
    await page.goto(`/proposer?copie=${fiche.split("/").pop()}`);
    await expect(champ).toHaveValue(description);
  });
});

test.describe("le paramètre d'adresse « espace »", () => {
  async function lieuChoisi(page: Page) {
    await page.getByLabel("Titre de l'activité").fill("Goûter");
    await continuerProposer(page);
    await etapeProposer(page, 2);
    return page.getByLabel("Lieu", { exact: true });
  }

  test("préchoisit l'espace commun", async ({ page }) => {
    const espace = await nouvelEspaceCommun();
    espaces.push(espace.nom);
    await ouvrirProposer(page, `/proposer?espace=${espace.id}`);

    await expect(await lieuChoisi(page)).toHaveValue(espace.id);
    await expect(page.getByLabel("Nom du lieu")).toHaveCount(0);
  });

  test("un identifiant inconnu est ignoré", async ({ page }) => {
    const espace = await nouvelEspaceCommun();
    espaces.push(espace.nom);
    await ouvrirProposer(
      page,
      "/proposer?espace=00000000-0000-0000-0000-000000000000",
    );

    await expect(await lieuChoisi(page)).toHaveValue("");
  });
});

test("sur mobile comme sur ordinateur, la saisie ne fait pas défiler la page horizontalement", async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    "Parcours en étapes du mobile : la page unique de l'ordinateur a ses propres tests.",
  );
  await ouvrirProposer(page);
  await page.getByLabel("Titre de l'activité").fill("Un titre d'activité");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Une description qui s'étire ".repeat(20));
  await verifierSansDefilementHorizontal(page);
});

test("« Publier » de la page unique, ou « Publier » du dernier écran : la publication est la même", async ({
  page,
}) => {
  await ouvrirProposer(page);
  const titre = `Publication ${Date.now()}`;
  await remplirLeNecessaire(page, titre);
  await page.getByRole("button", { name: /^Publier/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();
});
