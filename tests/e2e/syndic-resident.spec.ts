import { expect, test, type Page } from "@playwright/test";
import {
  arriveeDuSyndic,
  MOT_DE_PASSE,
  nouveauSyndic,
  nouveauSyndicSansNom,
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

function ecranDeCompletion(page: Page) {
  return page.getByRole("heading", {
    level: 1,
    name: "Présentez-vous à vos voisins",
  });
}

test("après connexion, un membre du syndic arrive sur l'espace syndic sur ordinateur, sur l'accueil sur mobile", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);

  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("arrivee-du-syndic.png"),
    fullPage: true,
  });
});

test("un membre du syndic sans prénom ni nom les saisit avant d'aller plus loin", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndicSansNom();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);
  await expect(ecranDeCompletion(page)).toBeVisible();

  await page.goto("/syndic");
  await expect(ecranDeCompletion(page)).toBeVisible();

  await page.getByLabel("Prénom").fill("Colette");
  await page.getByLabel("Nom", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Saisissez votre nom.")).toBeVisible();
  await expect(page.getByLabel("Prénom")).toHaveValue("Colette");
  await page.screenshot({
    path: test.info().outputPath("completion-du-profil.png"),
    fullPage: true,
  });

  await page.getByLabel("Nom", { exact: true }).fill("Durand");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
  await page.getByRole("button", { name: "Mon profil" }).click();
  await expect(
    page.getByRole("dialog", { name: "Menu du profil" }),
  ).toContainText("Colette Durand");
});

test("un membre du syndic sans prénom ni nom retrouve la page demandée après les avoir saisis", async ({
  page,
}) => {
  const syndic = await nouveauSyndicSansNom();
  emails.push(syndic.email);

  await page.goto("/syndic/membres");
  await expect(page).toHaveURL(/\/connexion/);
  await page.getByLabel("Adresse email").fill(syndic.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(ecranDeCompletion(page)).toBeVisible();
  await page.getByLabel("Prénom").fill("Colette");
  await page.getByLabel("Nom", { exact: true }).fill("Durand");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Membres du syndic" }),
  ).toBeVisible();
});
