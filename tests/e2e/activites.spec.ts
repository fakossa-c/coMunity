import { expect, test, type Page } from "@playwright/test";
import { MOT_DE_PASSE, nouveauResident, supprimerComptes } from "./outils";

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

test("un résident validé crée une activité et la retrouve dans le catalogue", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Activités" })
    .click();
  await page.getByRole("link", { name: "Proposer" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();

  const titre = "Atelier compost du jeudi";
  await page.getByLabel("Titre de l'activité").fill(titre);
  await page.getByLabel("Catégorie").selectOption({ label: "Jardin & Nature" });
  await page
    .getByLabel("Description")
    .fill("On apprend à composter ensemble, dans la cour.");
  const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Date").fill(dansUnMois);
  await page.getByLabel("Heure de début").fill("10:00");
  await page.getByLabel("Heure de fin").fill("11:30");
  await page.getByLabel("Lieu").fill("Cour intérieure");
  await page.getByRole("button", { name: "Publier l'activité" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  const catalogue = page.getByRole("list", { name: "Activités à venir" });
  await expect(catalogue).toContainText(titre);
  await expect(catalogue).toContainText("Cour intérieure");
  await page.screenshot({
    path: test.info().outputPath("catalogue-activite.png"),
    fullPage: true,
  });
});

test("un résident en attente ne voit pas le formulaire de création", async ({
  page,
}) => {
  const resident = await nouveauResident("en_attente");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/proposer");

  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();
  await expect(page.getByLabel("Titre de l'activité")).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(
    "Vous pourrez proposer une activité dès que votre compte sera validé",
  );
});
