import { expect, test, type Page } from "@playwright/test";
import { MOT_DE_PASSE, nouveauResident, supprimerComptes } from "./outils";

// Ticket #9 : le parcours de création en 4 étapes, du bouton « Proposer » à la fiche publiée.

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
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
  return expect(page.getByRole("main")).toContainText(
    `Étape ${numero} sur 4`,
  );
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
  await page.getByLabel("Date").fill(dansUnMois());
  await page.getByLabel("Heure de début").fill("10:00");
  await page.getByLabel("Heure de fin").fill("11:30");
  await page.getByLabel("Lieu").fill("Cour intérieure");
  await page
    .getByLabel("Précision d'accès")
    .fill("Par le portail vert, au fond de la cour.");
  await continuer(page);

  await etape(page, 3);
  await page.getByRole("radio", { name: "Limité" }).check();
  await page.getByLabel("Nombre de places").fill("12");
  await page.getByLabel("Minimum de participants").fill("4");
  await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
  await page.getByRole("checkbox", { name: "Enfants bienvenus" }).check();
  await page.getByLabel("Conseils pratiques").fill("Prévoyez une petite laine.");
  await page.getByLabel("Matériel à prévoir").fill("Gants fournis.");
  await page
    .getByLabel("Ce que vous pouvez apporter")
    .fill("Vos épluchures de la semaine.");
  await continuer(page);

  await etape(page, 4);
}

test("un résident propose une activité en quatre étapes, sans perdre sa saisie", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const titre = `Atelier compost ${Date.now()}`;

  await seConnecter(page, resident.email);
  await page.goto("/activites");
  await page.getByRole("link", { name: "Proposer" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();

  // Étape 1 : le titre se compte, un titre vide ne passe pas.
  await etape(page, 1);
  await expect(page.getByRole("main")).toContainText("Titre et catégorie");
  await continuer(page);
  await expect(page.getByRole("alert")).toContainText("Donnez un titre");
  await page.getByLabel("Titre de l'activité").fill("Atelier");
  await expect(page.getByRole("main")).toContainText("7 / 50");
  await page.getByLabel("Titre de l'activité").fill(titre);
  await page.getByLabel("Catégorie").selectOption({ label: "Jardin & Nature" });
  await page.getByLabel("Mot d'accueil").fill("Venez comme vous êtes.");
  await expect(page.getByRole("main")).toContainText("22 / 300");
  await continuer(page);

  // Étape 2 : une fin avant le début est refusée sous le champ concerné.
  await etape(page, 2);
  await page.getByLabel("Date").fill(dansUnMois());
  await page.getByLabel("Heure de début").fill("10:00");
  await page.getByLabel("Heure de fin").fill("09:00");
  await page.getByLabel("Lieu").fill("Cour intérieure");
  await continuer(page);
  await expect(page.getByRole("alert")).toContainText(
    "L'heure de fin doit être après l'heure de début.",
  );
  await page.getByLabel("Heure de fin").fill("11:30");
  await page.getByLabel("Précision d'accès").fill("Par le portail vert.");
  await expect(page.getByRole("main")).toContainText("20 / 120");
  await continuer(page);

  // Étape 3 : places limitées, minimum sous le maximum, deux étiquettes.
  await etape(page, 3);
  await expect(page.getByLabel("Nombre de places")).toHaveCount(0);
  await page.getByRole("radio", { name: "Limité" }).check();
  await page.getByLabel("Nombre de places").fill("12");
  await page.getByLabel("Minimum de participants").fill("20");
  await continuer(page);
  await expect(page.getByRole("alert")).toContainText(
    "Le minimum ne peut pas dépasser le nombre de places.",
  );
  await page.getByLabel("Minimum de participants").fill("4");
  await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
  await page.getByRole("checkbox", { name: "Enfants bienvenus" }).check();
  await page.getByLabel("Conseils pratiques").fill("Prévoyez une petite laine.");

  // Précédent puis Continuer : rien n'est perdu, dans un sens comme dans l'autre.
  await page.getByRole("button", { name: "Précédent" }).click();
  await etape(page, 2);
  await expect(page.getByLabel("Lieu")).toHaveValue("Cour intérieure");
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
    .getByRole("button", { name: "Modifier : Titre et catégorie" })
    .click();
  await etape(page, 1);
  await expect(page.getByLabel("Titre de l'activité")).toHaveValue(titre);
  await continuer(page);
  await continuer(page);
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
    .getByRole("list", { name: "Activités à venir" })
    .getByRole("listitem")
    .filter({ hasText: titre });
  await expect(carte).toContainText("Accès plain-pied");
  await expect(carte).toContainText("Enfants bienvenus");
});

test("« Annuler la proposition » ne publie rien", async ({ page }) => {
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
