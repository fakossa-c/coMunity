import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  inscrireResident,
  laisserRetour,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  supprimerComptes,
} from "./outils";

// Ticket #17 : le conseil syndical suit ce qui anime la résidence depuis son tableau de bord. Les
// chiffres exacts se vérifient dans tests/db/tableau-de-bord.test.ts, sur un jeu de données fixe ;
// ici, le parcours du membre du conseil syndical : la période, les graphiques lisibles en texte,
// le classement avec ses retours, et « Utiliser comme modèle ».

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

/** Hier : une activité qui a eu lieu, dans toutes les périodes du tableau de bord. */
function hier() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Une activité d'hier au titre unique, deux participants qui l'ont notée 5, et un membre du conseil syndical connecté. */
async function activiteReussie(page: Page) {
  const [createur, participant1, participant2, syndic] = await Promise.all([
    nouveauResident(),
    nouveauResident(),
    nouveauResident(),
    nouveauSyndic(),
  ]);
  emails.push(
    createur.email,
    participant1.email,
    participant2.email,
    syndic.email,
  );
  const titre = `Repas de quartier ${randomUUID().slice(0, 6)}`;
  const identifiant = await nouvelleActivite(createur.id, {
    titre,
    date_activite: hier(),
    capacite_max: 6,
  });
  await inscrireResident(identifiant, participant1.id, 1);
  await inscrireResident(identifiant, participant2.id);
  await laisserRetour(identifiant, participant1.id, 5, "Très convivial");
  await laisserRetour(
    identifiant,
    participant2.id,
    5,
    "À refaire dès que possible",
  );
  await seConnecter(page, syndic.email);
  return { titre, identifiant, createur };
}

test("le tableau de bord montre les chiffres, les graphiques en texte et le sélecteur de période", async ({
  page,
}) => {
  await activiteReussie(page);

  await page.goto("/syndic");
  await page.getByRole("link", { name: /^Tableau de bord/ }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Tableau de bord" }),
  ).toBeVisible();

  // Trois mois par défaut ; changer de période le dit dans la barre et l'adresse.
  const periodes = page.getByRole("navigation", { name: "Période" });
  await expect(
    periodes.getByRole("link", { name: "3 derniers mois" }),
  ).toHaveAttribute("aria-current", "true");
  await periodes.getByRole("link", { name: "12 derniers mois" }).click();
  await expect(page).toHaveURL(/periode=12_mois/);
  await expect(
    periodes.getByRole("link", { name: "12 derniers mois" }),
  ).toHaveAttribute("aria-current", "true");

  // Les chiffres du mois : au moins l'activité et ses 3 personnes (2 inscrits + 1 accompagnant compté en places).
  const chiffres = page.getByRole("region", { name: "En chiffres" });
  await expect(chiffres.getByText("Participants distincts")).toBeVisible();
  await expect(chiffres.getByText("Résidents validés")).toBeVisible();

  // Chaque graphique se lit en texte : une phrase, puis une ligne par valeur.
  const jours = page
    .getByRole("figure")
    .filter({ hasText: "Par jour de la semaine" });
  await expect(jours.getByRole("listitem")).toHaveCount(7);
  await expect(jours.getByText(/^Meilleur remplissage moyen : /)).toBeVisible();
  const creneaux = page
    .getByRole("figure")
    .filter({ hasText: "Par tranche horaire" });
  await expect(creneaux.getByRole("listitem")).toHaveCount(3);
  const categories = page
    .getByRole("figure")
    .filter({ hasText: "Par catégorie" });
  await expect(categories.getByRole("listitem")).toHaveCount(5);
  await expect(
    page
      .getByRole("figure")
      .filter({ hasText: "Participants distincts par mois" }),
  ).toBeVisible();
});

test("le classement donne la note, les retours, et « Utiliser comme modèle » ouvre le parcours prérempli", async ({
  page,
}) => {
  const { titre } = await activiteReussie(page);

  await page.goto("/syndic/tableau-de-bord");

  const carte = page.getByRole("listitem").filter({ hasText: titre });
  await expect(carte).toContainText("5 / 5 · 2 retours");

  await carte.getByText("Lire les retours").click();
  await expect(carte.getByText("Très convivial")).toBeVisible();
  await expect(carte.getByText("À refaire dès que possible")).toBeVisible();

  await carte.getByRole("link", { name: "Utiliser comme modèle" }).click();
  await expect(page).toHaveURL(/\/proposer\?copie=/);
  await expect(page.getByLabel("Titre de l'activité")).toHaveValue(titre);
});

test("un résident, même créateur de l'activité, n'accède pas au tableau de bord", async ({
  page,
}) => {
  const { createur } = await activiteReussie(page);
  await page.context().clearCookies();
  await seConnecter(page, createur.email);

  await page.goto("/syndic/tableau-de-bord");

  await expect(page.getByText("Accès non autorisé")).toBeVisible();
  await expect(
    page.getByText("Cet espace est réservé aux membres du conseil syndical."),
  ).toBeVisible();
  await expect(page.getByText("Participants distincts")).toHaveCount(0);
});

test("un résident ne copie pas l'activité d'un autre voisin", async ({
  page,
}) => {
  const { identifiant } = await activiteReussie(page);
  const voisin = await nouveauResident();
  emails.push(voisin.email);
  await page.context().clearCookies();
  await seConnecter(page, voisin.email);

  await page.goto(`/proposer?copie=${identifiant}`);

  await expect(page.getByLabel("Titre de l'activité")).toHaveValue("");
});

test("le tableau de bord n'a pas de défaut d'accessibilité critique", async ({
  page,
}) => {
  await activiteReussie(page);
  await page.goto("/syndic/tableau-de-bord");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tableau de bord" }),
  ).toBeVisible();

  const resultat = await new AxeBuilder({ page }).include("main").analyze();
  const critiques = resultat.violations.filter((v) => v.impact === "critical");
  expect(critiques, JSON.stringify(critiques, null, 2)).toEqual([]);
});
