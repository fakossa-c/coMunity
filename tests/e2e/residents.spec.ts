import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  codeResidence,
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

const BANDEAU = "Votre compte attend la validation du syndic";

test("un résident s'inscrit avec le code de la résidence, puis le syndic le valide", async ({
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

  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByLabel("Confirmez le mot de passe").fill(MOT_DE_PASSE);
  await page.getByLabel("Prénom").fill("Colette");
  await page.getByLabel("Bâtiment").fill("B");
  await page.getByLabel("Étage").selectOption({ label: "3e étage" });
  await page.getByLabel("Code de la résidence").fill("PAS-LE-BON");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Ce code de résidence n'est pas le bon",
  );
  await expect(page.getByLabel("Prénom")).toHaveValue("Colette");

  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByLabel("Confirmez le mot de passe").fill(MOT_DE_PASSE);
  await page.getByLabel("Code de la résidence").fill(await codeResidence());
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
  await expect(enAttente).toContainText("Colette");
  await expect(enAttente).toContainText("Bâtiment B · 3e étage");
  await syndic.page.screenshot({
    path: test.info().outputPath("residents-en-attente.png"),
    fullPage: true,
  });
  await enAttente.getByRole("button", { name: "Valider" }).click();
  await expect(syndic.page.getByRole("main").getByRole("status")).toContainText(
    "Compte de Colette validé",
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
    "Compte de Danielle refusé",
  );
  await syndic.appareil.close();

  await seConnecter(page, resident.email);
  await expect(page.getByRole("main")).toContainText(
    "Votre compte n'a pas été accepté",
  );
  await expect(page.getByRole("main")).toContainText("contactez le syndic");
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
    "Accès retiré à Danielle",
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
});

test("le syndic consulte le code de la résidence", async ({ page }) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);
  await page.getByRole("link", { name: /Code de la résidence/ }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Code de la résidence" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(await codeResidence());
  await expect(
    page.getByRole("button", { name: "Régénérer le code" }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("code-residence.png"),
    fullPage: true,
  });
});
