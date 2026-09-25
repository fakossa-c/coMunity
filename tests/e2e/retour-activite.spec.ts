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

/** Remplit et envoie le formulaire de connexion, déjà affiché. */
async function remplirConnexion(page: Page, email: string) {
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/** Se connecte depuis n'importe quelle page, déconnecté. */
async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await remplirConnexion(page, email);
  await expect(page).not.toHaveURL(/\/connexion/);
}

/** Une activité passée, publiée au nom de `organisateur`. */
async function activitePassee(organisateur: string) {
  return nouvelleActivite(organisateur, { date_activite: "2020-01-04" });
}

/**
 * Inscrit `email` (pas encore connecté) à l'activité de la page courante, en passant par le
 * bouton « Je participe » comme le veut le parcours réel : il envoie se connecter puis revient
 * sur la fiche (`suivant`), ce qu'un `page.goto("/connexion")` direct ne fait pas.
 */
async function inscrireEtSeConnecter(page: Page, email: string) {
  await page.getByRole("button", { name: "Je participe" }).click();
  await expect(page).toHaveURL(/\/connexion/);
  await remplirConnexion(page, email);
  await expect(page).not.toHaveURL(/\/connexion/);
  await page.getByRole("button", { name: "Je participe" }).click();
  await expect(page.getByText("J'y vais", { exact: false })).toBeVisible();
}

test("un participant laisse un retour sur une activité passée où il est allé", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const participant = await nouveauResident("valide");
  emails.push(organisateur.email, participant.email);
  const identifiant = await activitePassee(organisateur.id);

  await page.goto(`/activites/${identifiant}`);
  await inscrireEtSeConnecter(page, participant.email);

  await expect(page.getByText("Comment était cette activité ?")).toBeVisible();
  await page.getByRole("radio", { name: "4 sur 5" }).check();
  await page
    .getByLabel("Votre avis")
    .fill("Un très bon moment, merci pour l'organisation !");
  await page.getByRole("button", { name: "Envoyer mon avis" }).click();

  await expect(page.getByText("Merci pour votre avis")).toBeVisible();
  await expect(page.getByText("Vous avez donné 4 / 5")).toBeVisible();

  await page.screenshot({
    path: test.info().outputPath("retour-active.png"),
    fullPage: true,
  });
});

test("un participant ne voit pas d'invitation sur une activité à venir", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const participant = await nouveauResident("valide");
  emails.push(organisateur.email, participant.email);
  const identifiant = await nouvelleActivite(organisateur.id);

  await page.goto(`/activites/${identifiant}`);
  await inscrireEtSeConnecter(page, participant.email);

  await expect(
    page.getByText("Comment était cette activité ?"),
  ).not.toBeVisible();
});

test("l'organisateur voit la note moyenne et les commentaires des participants", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const participant = await nouveauResident("valide");
  emails.push(organisateur.email, participant.email);
  const identifiant = await activitePassee(organisateur.id);

  await page.goto(`/activites/${identifiant}`);
  await inscrireEtSeConnecter(page, participant.email);
  await page.getByRole("radio", { name: "5 sur 5" }).check();
  await page.getByLabel("Votre avis").fill("Parfait, à refaire.");
  await page.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(page.getByText("Merci pour votre avis")).toBeVisible();

  await page.context().clearCookies();
  await seConnecter(page, organisateur.email);
  await page.goto(`/activites/${identifiant}`);

  const retours = page.getByRole("region", {
    name: "Retours des participants",
  });
  await expect(retours).toBeVisible();
  await expect(retours).toContainText("5 / 5 · 1 retour");
  await expect(retours).toContainText("« Parfait, à refaire. » — 5 / 5");
});

test("le conseil syndical voit la note moyenne d'une activité qu'il n'organise pas", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const participant = await nouveauResident("valide");
  const syndic = await nouveauSyndic();
  emails.push(organisateur.email, participant.email, syndic.email);
  const identifiant = await activitePassee(organisateur.id);

  await page.goto(`/activites/${identifiant}`);
  await inscrireEtSeConnecter(page, participant.email);
  await page.getByRole("radio", { name: "3 sur 5" }).check();
  await page.getByLabel("Votre avis").fill("Correct.");
  await page.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(page.getByText("Merci pour votre avis")).toBeVisible();

  await page.context().clearCookies();
  await seConnecter(page, syndic.email);
  await page.goto(`/activites/${identifiant}`);

  const retours = page.getByRole("region", {
    name: "Retours des participants",
  });
  await expect(retours).toBeVisible();
  await expect(retours).toContainText("3 / 5 · 1 retour");
});

test("un simple participant ne voit pas le bloc des retours", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const premier = await nouveauResident("valide");
  const second = await nouveauResident("valide");
  emails.push(organisateur.email, premier.email, second.email);
  const identifiant = await activitePassee(organisateur.id);

  await page.goto(`/activites/${identifiant}`);
  await inscrireEtSeConnecter(page, premier.email);
  await page.getByRole("radio", { name: "2 sur 5" }).check();
  await page.getByLabel("Votre avis").fill("Mitigé.");
  await page.getByRole("button", { name: "Envoyer mon avis" }).click();
  await expect(page.getByText("Merci pour votre avis")).toBeVisible();

  await page.context().clearCookies();
  await page.goto(`/activites/${identifiant}`);
  await inscrireEtSeConnecter(page, second.email);

  await expect(page.getByText("Retours des participants")).not.toBeVisible();
});
