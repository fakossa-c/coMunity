import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  supprimerComptes,
} from "./outils";

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test("un visiteur ouvre le lien déconnecté, se connecte, s'inscrit puis annule", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const identifiant = await nouvelleActivite(organisateur.id, {
    capacite_max: "12",
  });

  await page.goto(`/activites/${identifiant}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Aucun inscrit sur 12 places")).toBeVisible();

  await page.getByRole("button", { name: "Je participe" }).click();
  await expect(page).toHaveURL(/\/connexion/);

  await seConnecter(page, resident.email);
  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));

  await page.getByRole("button", { name: "Je participe" }).click();
  await expect(page.getByText("J'y vais", { exact: false })).toBeVisible();
  await expect(page.getByText("1 inscrit sur 12 places")).toBeVisible();

  // Le premier clic ouvre la feuille de confirmation, le second (dans la feuille) confirme.
  await page.getByRole("button", { name: "Annuler" }).click();
  await page
    .getByRole("button", { name: "Annuler", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Je participe" }),
  ).toBeVisible();
  await expect(page.getByText("Aucun inscrit sur 12 places")).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath("inscription-activite.png"),
    fullPage: true,
  });
});

test("une activité complète refuse une nouvelle inscription", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const premier = await nouveauResident("valide");
  const second = await nouveauResident("valide");
  emails.push(organisateur.email, premier.email, second.email);
  const identifiant = await nouvelleActivite(organisateur.id, {
    capacite_max: "1",
  });

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("button", { name: "Je participe" }).click();
  await seConnecter(page, premier.email);
  await page.getByRole("button", { name: "Je participe" }).click();
  await expect(page.getByText("J'y vais", { exact: false })).toBeVisible();

  await page.context().clearCookies();
  await page.goto(`/activites/${identifiant}`);
  await expect(page.getByRole("button", { name: "Complet" })).toBeDisabled();
  await page.goto(
    `/connexion?suivant=${encodeURIComponent(`/activites/${identifiant}`)}`,
  );
  await seConnecter(page, second.email);

  await expect(page.getByRole("button", { name: "Complet" })).toBeDisabled();
});

test("un résident en attente voit le bouton désactivé avec une explication", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const enAttente = await nouveauResident("en_attente");
  emails.push(organisateur.email, enAttente.email);
  const identifiant = await nouvelleActivite(organisateur.id);

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("button", { name: "Je participe" }).click();
  await seConnecter(page, enAttente.email);

  await expect(
    page.getByRole("button", { name: "Je participe" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Votre compte doit être validé par le conseil syndical"),
  ).toBeVisible();
});

test("une activité où je suis déjà inscrit affiche « J'y vais » sur sa carte à l'Accueil", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const titre = `Pétanque ${Date.now()}`;
  const identifiant = await nouvelleActivite(organisateur.id, { titre });

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("button", { name: "Je participe" }).click();
  await seConnecter(page, resident.email);
  await page.getByRole("button", { name: "Je participe" }).click();
  await expect(page.getByText("J'y vais", { exact: false })).toBeVisible();

  await page.goto("/");
  const carte = page.getByRole("listitem").filter({ hasText: titre });
  await expect(carte.getByText("J'y vais", { exact: true })).toBeVisible();
  await expect(carte.getByRole("button")).toHaveCount(0);
});

test("une activité du syndic s'inscrit comme les autres", async ({ page }) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const identifiant = await nouvelleActivite(syndic.id);

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("button", { name: "Je participe" }).click();
  await seConnecter(page, resident.email);
  await page.getByRole("button", { name: "Je participe" }).click();

  await expect(page.getByText("J'y vais", { exact: false })).toBeVisible();
});
