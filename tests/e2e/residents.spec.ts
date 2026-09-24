import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelEmail,
  supprimerComptes,
} from "./outils";

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

/** Le syndic, connecté sur son propre appareil, ouvre la page des résidents. */
async function syndicSurLesResidents(browser: Browser) {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const appareil = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const page = await appareil.newPage();
  await seConnecter(page, syndic.email);
  await page.getByRole("link", { name: /Résidents/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Résidents" }),
  ).toBeVisible();
  return { page, appareil };
}

function ligne(page: Page, liste: string, email: string) {
  return page
    .getByRole("list", { name: liste })
    .getByRole("listitem")
    .filter({ hasText: email });
}

function navigationPrincipale(page: Page) {
  return page.getByRole("navigation", { name: "Navigation principale" });
}

const BANDEAU = "Votre compte attend la validation du syndic";

test("un résident s'inscrit avec son prénom et son nom, puis le syndic le valide", async ({
  page,
  browser,
}) => {
  const email = nouvelEmail("inscription");
  emails.push(email);

  await page.goto("/connexion");
  await page.getByRole("link", { name: "Créer mon compte" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Créer mon compte" }),
  ).toBeVisible();

  await expect(page.getByLabel("Code de la résidence")).toHaveCount(0);
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByLabel("Confirmez le mot de passe").fill("pas-le-meme");
  await page.getByLabel("Prénom").fill("Colette");
  await page.getByLabel("Nom", { exact: true }).fill("Durand");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Les deux mots de passe ne sont pas identiques",
  );
  await expect(page.getByLabel("Prénom")).toHaveValue("Colette");
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Durand");

  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByLabel("Confirmez le mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(BANDEAU);
  await page.screenshot({
    path: test.info().outputPath("resident-en-attente.png"),
    fullPage: true,
  });

  const syndic = await syndicSurLesResidents(browser);
  const enAttente = ligne(syndic.page, "Résidents en attente", email);
  await expect(enAttente).toContainText("Colette Durand");
  await syndic.page.screenshot({
    path: test.info().outputPath("residents-en-attente.png"),
    fullPage: true,
  });
  await enAttente.getByRole("button", { name: "Valider" }).click();
  await expect(syndic.page.getByRole("main").getByRole("status")).toContainText(
    "Compte de Colette Durand validé",
  );
  await expect(ligne(syndic.page, "Résidents validés", email)).toBeVisible();
  await syndic.appareil.close();

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText(BANDEAU);
});

test("un résident refusé ne voit qu'un message l'invitant à contacter le syndic", async ({
  page,
  browser,
}) => {
  const resident = await nouveauResident("en_attente");
  emails.push(resident.email);

  const syndic = await syndicSurLesResidents(browser);
  const enAttente = ligne(syndic.page, "Résidents en attente", resident.email);
  await enAttente.getByRole("button", { name: "Refuser" }).click();
  await enAttente.getByRole("button", { name: "Confirmer le refus" }).click();
  await expect(syndic.page.getByRole("main").getByRole("status")).toContainText(
    "Compte de Danielle Martin refusé",
  );
  await syndic.appareil.close();

  await seConnecter(page, resident.email);
  await expect(page.getByRole("main")).toContainText(
    "Votre compte n'a pas été accepté",
  );
  await expect(page.getByRole("main")).toContainText("contactez le syndic");
  await expect(navigationPrincipale(page)).toHaveCount(0);
  await page.goto("/proposer");
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(
    "Votre compte n'a pas été accepté",
  );
});

test("le syndic retire un résident qui déménage, qui ne voit plus qu'un message d'état", async ({
  page,
  browser,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  const syndic = await syndicSurLesResidents(browser);
  const valide = ligne(syndic.page, "Résidents validés", resident.email);
  await valide.getByRole("button", { name: "Retirer l'accès" }).click();
  await valide.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(syndic.page.getByRole("main").getByRole("status")).toContainText(
    "Accès retiré à Danielle Martin",
  );
  await expect(
    ligne(syndic.page, "Résidents validés", resident.email),
  ).toHaveCount(0);
  await syndic.appareil.close();

  await seConnecter(page, resident.email);
  await expect(page.getByRole("main")).toContainText(
    "Votre accès à la résidence a été retiré",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toHaveCount(0);
  await expect(navigationPrincipale(page)).toHaveCount(0);
});

test("l'espace syndic ne propose plus de code de résidence", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Espace syndic" }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: /Code de la résidence/ }),
  ).toHaveCount(0);
});
