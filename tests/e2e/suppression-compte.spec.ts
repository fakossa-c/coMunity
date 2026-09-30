import { expect, test, type Page } from "@playwright/test";
import { lireSupabaseLocal } from "../../scripts/supabase-local.mjs";
import {
  MOT_DE_PASSE,
  inscrireResident,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  nouvelleActiviteAvecPhotos,
  supprimerComptes,
} from "./outils";

// Ticket #41 : un résident supprime son compte depuis Profil › Mes identifiants.

const emails: string[] = [];

/** L'adresse publique d'une photo du bucket `activites`. */
function urlPhoto(urlSupabase: string, chemin: string) {
  return `${urlSupabase}/storage/v1/object/public/activites/${chemin}`;
}

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

const EXPLICATION =
  "Supprimer votre compte efface vos informations, vos inscriptions et vos propositions d'activités. Cette action est définitive.";

test("« Garder mon compte » referme l'explication sans rien supprimer", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await page.goto("/profil/identifiants");

  await expect(page.getByText(EXPLICATION)).toHaveCount(0);
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page.getByText(EXPLICATION)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Oui, supprimer mon compte" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Garder mon compte" }).click();
  await expect(page.getByText(EXPLICATION)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Supprimer mon compte" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Mes identifiants" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Vos identifiants" }),
  ).toContainText(resident.email);
});

test("la suppression déconnecte, ferme le compte, annule l'activité à venir des inscrits et retire ses photos", async ({
  page,
  browser,
}) => {
  const createur = await nouveauResident("valide");
  const inscrit = await nouveauResident("valide");
  emails.push(createur.email, inscrit.email);
  const { identifiant, chemins } = await nouvelleActiviteAvecPhotos(
    createur.id,
    ["#e07a5f"],
    { titre: "Goûter des inscrits" },
  );
  await inscrireResident(identifiant, inscrit.id);
  const sansInscrit = await nouvelleActiviteAvecPhotos(
    createur.id,
    ["#3d405b"],
    { titre: "Goûter sans inscrit" },
  );
  await nouvelleActivite(createur.id, {
    titre: "Vide-grenier passé",
    date_activite: "2020-01-04",
  });
  const { url } = lireSupabaseLocal();
  expect((await page.request.get(urlPhoto(url, chemins[0]))).status()).toBe(
    200,
  );

  await seConnecter(page, createur.email);
  await page.goto("/profil/identifiants");
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await page.getByRole("button", { name: "Oui, supprimer mon compte" }).click();

  // Déconnecté : l'accueil propose de se connecter, les pages du compte renvoient à la connexion.
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await page.goto("/profil/identifiants");
  await expect(page).toHaveURL(/\/connexion/);

  // Plus de connexion avec cet email.
  await page.getByLabel("Adresse email").fill(createur.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Email ou mot de passe incorrect")).toBeVisible();

  // L'inscrit voit l'activité annulée dans « Je participe », l'autre a disparu.
  const contexte = await browser.newContext();
  const pageInscrit = await contexte.newPage();
  await seConnecter(pageInscrit, inscrit.email);
  await pageInscrit.goto("/activites");
  const carte = pageInscrit
    .getByRole("article")
    .filter({ hasText: "Goûter des inscrits" });
  await expect(carte).toContainText("Annulée");
  await expect(pageInscrit.getByText("Goûter sans inscrit")).toHaveCount(0);
  await contexte.close();

  // Plus aucune photo servie pour les activités annulée ou supprimée.
  expect((await page.request.get(urlPhoto(url, chemins[0]))).status()).not.toBe(
    200,
  );
  expect(
    (await page.request.get(urlPhoto(url, sansInscrit.chemins[0]))).status(),
  ).not.toBe(200);
});

test("un membre du syndic ne trouve pas « Supprimer mon compte » dans ses identifiants", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(syndic.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);

  await page.goto("/profil/identifiants");

  await expect(
    page.getByRole("heading", { level: 1, name: "Mes identifiants" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Vos identifiants" }),
  ).toContainText(syndic.email);
  await expect(
    page.getByRole("button", { name: "Supprimer mon compte" }),
  ).toHaveCount(0);
});
