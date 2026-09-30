import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  arriveeDuSyndic,
  nouveauResident,
  nouveauSyndic,
  supprimerComptes,
  titreAccueil,
} from "./outils";

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string, depuis = "/connexion") {
  await page.goto(depuis);
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

function pageArrivee(page: Page) {
  return page.getByRole("group", { name: "Page d'arrivée" });
}

test("un membre du conseil syndical arrive sur le tableau de bord, puis sur l'Accueil s'il le choisit", async ({
  page,
  context,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
  await expect(page).toHaveURL(/\/syndic\/tableau-de-bord$/);

  await page.goto("/profil/reglages");
  await expect(
    pageArrivee(page).getByRole("radio", { name: "Tableau de bord" }),
  ).toBeChecked();
  await expect(
    page.getByText("La page qui s'ouvre après la connexion."),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("reglages-du-syndic.png"),
    fullPage: true,
  });

  // L'enregistrement part en arrière-plan : attendu avant de quitter la page.
  const enregistre = page.waitForResponse(
    (reponse) =>
      reponse.url() === page.url() && reponse.request().method() === "POST",
  );
  await pageArrivee(page).getByRole("radio", { name: "Accueil" }).click();
  await enregistre;

  // Une autre session, sans l'état du navigateur précédent : un autre appareil.
  await context.clearCookies();
  await seConnecter(page, syndic.email);
  await expect(titreAccueil(page)).toBeVisible();
});

test("une page demandée l'emporte sur la page d'arrivée", async ({ page }) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email, "/connexion?suivant=%2Fannonces");

  await expect(page).toHaveURL(/\/annonces$/);
});

test("un résident arrive sur l'Accueil", async ({ page }) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);

  await expect(titreAccueil(page)).toBeVisible();
});
