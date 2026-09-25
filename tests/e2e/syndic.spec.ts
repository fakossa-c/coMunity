import { expect, test, type Page } from "@playwright/test";
import {
  arriveeDuSyndic,
  lienRecu,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelEmail,
  supprimerComptes,
} from "./outils";

const NOUVEAU_MOT_DE_PASSE = "un-nouveau-mot-de-passe";
const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string, motDePasse: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

function listeDesMembres(page: Page) {
  return page.getByRole("list", { name: "Membres du syndic" });
}

async function choisirMotDePasse(page: Page, motDePasse: string) {
  await page.getByLabel("Nouveau mot de passe").fill(motDePasse);
  await page.getByLabel("Confirmez le mot de passe").fill(motDePasse);
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();
}

test("un membre du syndic invite un collègue, qui saisit son prénom, son nom et son mot de passe, et arrive dans l'espace syndic", async ({
  page,
  browser,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  const collegue = nouvelEmail("collegue");
  emails.push(syndic.email, collegue);

  await seConnecter(page, syndic.email, MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();

  await page.goto("/syndic");
  await page.getByRole("link", { name: /Membres du syndic/ }).click();
  await expect(listeDesMembres(page)).toContainText(syndic.email);

  await page.getByLabel("Adresse email du collègue").fill(collegue);
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `Invitation envoyée à ${collegue}`,
  );
  await expect(listeDesMembres(page)).toContainText(collegue);

  // Le collègue ouvre l'email sur son propre appareil.
  const appareilDuCollegue = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const pageDuCollegue = await appareilDuCollegue.newPage();
  await pageDuCollegue.goto(await lienRecu(collegue));
  await expect(
    pageDuCollegue.getByRole("heading", {
      level: 1,
      name: "Choisissez votre mot de passe",
    }),
  ).toBeVisible();
  await pageDuCollegue.getByLabel("Prénom").fill("Bernard");
  await pageDuCollegue.getByLabel("Nom", { exact: true }).fill("Lefèvre");
  await choisirMotDePasse(pageDuCollegue, NOUVEAU_MOT_DE_PASSE);

  await expect(
    arriveeDuSyndic(pageDuCollegue, { mobile: isMobile }),
  ).toBeVisible();
  await pageDuCollegue.getByRole("button", { name: "Mon profil" }).click();
  await expect(
    pageDuCollegue.getByRole("dialog", { name: "Menu du profil" }),
  ).toContainText("Bernard Lefèvre");
  await page.screenshot({
    path: test.info().outputPath("membres-du-syndic.png"),
    fullPage: true,
  });
  await appareilDuCollegue.close();
});

test("un membre du syndic retire l'accès d'un collègue, qui ne peut plus entrer dans l'espace syndic", async ({
  page,
  browser,
  isMobile,
}) => {
  const [moi, collegue] = [await nouveauSyndic(), await nouveauSyndic()];
  emails.push(moi.email, collegue.email);

  await seConnecter(page, moi.email, MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
  await page.goto("/syndic/membres");
  const ligne = listeDesMembres(page)
    .getByRole("listitem")
    .filter({ hasText: collegue.email });
  await ligne.getByRole("button", { name: "Retirer l'accès" }).click();
  await ligne.getByRole("button", { name: "Confirmer le retrait" }).click();

  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `Accès retiré à ${collegue.email}`,
  );
  await expect(listeDesMembres(page)).not.toContainText(collegue.email);
  await expect(listeDesMembres(page)).toContainText(moi.email);

  const appareilDuCollegue = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const pageDuCollegue = await appareilDuCollegue.newPage();
  await seConnecter(pageDuCollegue, collegue.email, MOT_DE_PASSE);
  await expect(
    pageDuCollegue.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  await pageDuCollegue.goto("/syndic");
  await expect(pageDuCollegue.getByRole("main")).toContainText(
    "Votre accès à l'espace syndic a été retiré",
  );
  await appareilDuCollegue.close();
});

test("mot de passe oublié, déconnexion et reconnexion", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email, "pas-le-bon-mot-de-passe");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Email ou mot de passe incorrect",
  );

  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  // La connexion a aussi un champ « Adresse email » : attendre la nouvelle page avant de saisir.
  await expect(
    page.getByRole("heading", { level: 1, name: "Mot de passe oublié" }),
  ).toBeVisible();
  await page.getByLabel("Adresse email").fill(syndic.email);
  await page.getByRole("button", { name: "Recevoir un lien" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "un email vient de vous être envoyé",
  );

  await page.goto(await lienRecu(syndic.email));
  await choisirMotDePasse(page, NOUVEAU_MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();

  await page.getByRole("button", { name: "Mon profil" }).click();
  await page
    .getByRole("dialog", { name: "Menu du profil" })
    .getByRole("button", { name: "Se déconnecter" })
    .click();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await page.goto("/syndic");
  await expect(page).toHaveURL(/\/connexion/);

  await seConnecter(page, syndic.email, NOUVEAU_MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
});

test("un résident n'entre pas dans l'espace syndic", async ({ page }) => {
  const resident = await nouveauResident();
  emails.push(resident.email);

  await seConnecter(page, resident.email, MOT_DE_PASSE);
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  await page.goto("/syndic/membres");

  await expect(page.getByRole("main")).toContainText(
    "Cet espace est réservé aux membres du syndic",
  );
  await expect(listeDesMembres(page)).toHaveCount(0);
});
