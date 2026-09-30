import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  choisirDate,
  continuerProposer,
  encartAssistant,
  estBureau,
  etapeProposer,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelEspaceCommun,
  nouvelleActivite,
  saisirLieuLibre,
  supprimerComptes,
  supprimerEspacesCommuns,
} from "./outils";

// Ticket #11 : les espaces communs gérés par le conseil syndical, et leurs règles appliquées par
// l'assistant dans le parcours de création.

const emails: string[] = [];
const espaces: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerEspacesCommuns(espaces.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

function dansUnMois() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function listeDesEspaces(page: Page) {
  return page.getByRole("list", { name: "Espaces communs" });
}

/** Ouvre le parcours et remplit l'étape 1. */
async function commencerProposition(page: Page, titre: string) {
  await page.goto("/proposer");
  await etapeProposer(page, 1);
  await page.getByLabel("Titre de l'activité").fill(titre);
  await continuerProposer(page);
  await etapeProposer(page, 2);
  await choisirDate(page, dansUnMois());
}

test("le conseil syndical ajoute, modifie puis supprime un espace commun", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const nom = `Salle des fêtes ${randomUUID().slice(0, 6)}`;
  espaces.push(nom);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic");
  await page.getByRole("link", { name: /Espaces communs/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Espaces communs" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Ajouter un espace commun" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Ajouter un espace commun" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Donnez un nom à l'espace commun.",
  );
  await page.getByLabel("Nom").fill(nom);
  await page.getByLabel("Bâtiment").fill("Bâtiment A");
  await page
    .getByLabel("Localisation")
    .fill("Rez-de-chaussée, au fond du hall");
  await page.getByLabel("Description").fill("Une grande pièce claire.");
  await page.getByLabel("Capacité").fill("20");
  await page.getByRole("checkbox", { name: "Coin cuisine" }).check();
  await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
  await page.getByLabel("Heure de fin maximale").fill("21:00");
  await page.getByLabel("Consignes").fill("Laissez la salle propre.");
  await page.getByLabel("Horaires d'accès").fill("Tous les jours de 9h à 21h");
  await page.getByLabel("Contact").fill("Colette, gardienne");
  await page.screenshot({
    path: test.info().outputPath("formulaire-espace.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est ajouté aux espaces communs.`,
  );
  const carte = listeDesEspaces(page).getByRole("listitem").filter({
    hasText: nom,
  });
  await expect(carte).toContainText("Jusqu'à 20 personnes");
  await expect(carte).toContainText("Ferme à 21h00");
  await expect(carte).toContainText("Coin cuisine");
  await page.screenshot({
    path: test.info().outputPath("espaces-communs.png"),
    fullPage: true,
  });

  await carte.getByRole("link", { name: "Modifier" }).click();
  await expect(page.getByLabel("Consignes")).toHaveValue(
    "Laissez la salle propre.",
  );
  await page.getByLabel("Capacité").fill("25");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est enregistré.`,
  );
  await expect(carte).toContainText("Jusqu'à 25 personnes");

  await carte.getByRole("link", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Supprimer l'espace commun" }).click();
  const feuille = page.getByRole("dialog", {
    name: "Supprimer cet espace commun ?",
  });
  await expect(feuille).toContainText("gardent son nom comme lieu");
  await feuille.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est supprimé.`,
  );
  // La liste disparaît quand plus aucun espace commun n'existe : on cherche la carte, pas la liste.
  await expect(
    page.getByRole("link", { name: `Modifier : ${nom}` }),
  ).toHaveCount(0);
});

test("le conseil syndical règle l'heure de calme de la résidence", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs");

  // La valeur de la résidence de test, que d'autres tests supposent : on la réenregistre.
  await expect(page.getByLabel("Heure de calme")).toHaveValue("22:00");
  await page.getByRole("button", { name: "Enregistrer l'heure" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Heure de calme enregistrée : 22h00.",
  );
});

test("un résident n'entre pas dans la gestion des espaces communs", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/syndic/espaces-communs");

  await expect(page.getByRole("main")).toContainText(
    "Cet espace est réservé aux membres du conseil syndical.",
  );
});

test("un créateur choisit un espace commun : ses consignes, ses règles, puis la fiche", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);
  await nouvelleActivite(resident.id, {
    titre: "Atelier tricot",
    date_activite: dansUnMois(),
    heure_debut: "19:00",
    heure_fin: "20:00",
    espace_commun_id: espace.id,
    capacite_max: 6,
  });
  const titre = `Soirée jeux ${Date.now()}`;

  await seConnecter(page, resident.email);
  await commencerProposition(page, titre);

  // Le lieu se choisit dans une liste : espaces de la résidence puis « Autre lieu… ». Sous l'espace
  // choisi : sa capacité, ses badges et ses consignes.
  const lieu = page.getByLabel("Lieu", { exact: true });
  await expect(lieu.locator("option").last()).toHaveText("Autre lieu…");
  await expect(page.getByRole("main")).not.toContainText(
    "Laissez la salle propre et fermez les fenêtres.",
  );
  await lieu.selectOption({ label: espace.nom });
  const resume = page
    .getByRole("main")
    .locator("div")
    .filter({ has: page.getByText(espace.nom, { exact: true }) })
    .filter({ hasText: "Jusqu'à 10 personnes" })
    .last();
  await expect(resume).toContainText("Coin cuisine");
  await expect(resume).toContainText(
    "Laissez la salle propre et fermez les fenêtres.",
  );
  await expect(page.getByLabel("Nom du lieu")).toHaveCount(0);

  // Bloqué après l'heure de fin maximale, avec l'heure limite.
  await page.getByLabel("Heure de début").selectOption("19:30");
  await page.getByLabel("Heure de fin").selectOption("21:30");
  // Sur mobile, « Continuer » refuse l'étape ; sur ordinateur, l'assistant le dit déjà en haut de la page.
  await continuerProposer(page);
  await expect(page.getByRole("main")).toContainText(
    "ferme à 21h00 : finissez au plus tard à 21h00.",
  );
  await page.screenshot({
    path: test.info().outputPath("heure-limite.png"),
    fullPage: true,
  });
  await page.getByLabel("Heure de fin").selectOption("21:00");
  await continuerProposer(page);

  // Bloqué sans limite de places dans un espace qui en a une.
  await etapeProposer(page, 3);
  await continuerProposer(page);
  await expect(page.getByRole("main")).toContainText(
    "accueille 10 personnes au plus : limitez les places à 10.",
  );
  await page.getByRole("radio", { name: "Limité", exact: true }).check();
  await page.getByLabel("Nombre de places").fill("8");
  await continuerProposer(page);

  // Le récapitulatif avertit du chevauchement, sans bloquer.
  await etapeProposer(page, 4);
  const conseils = encartAssistant(page).locator("..");
  await expect(conseils).toContainText(
    `« Atelier tricot » occupe déjà l'espace commun « ${espace.nom} » ce jour-là`,
  );
  await expect(page.getByRole("main")).toContainText(espace.nom);
  await page.getByRole("button", { name: /^Publier/ }).click();

  await page.getByRole("link", { name: "Voir la fiche" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: titre }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(espace.nom);
  await expect(page.getByRole("main")).toContainText(
    "Consignes de l'espace commun",
  );
  await expect(page.getByRole("main")).toContainText(
    "Laissez la salle propre et fermez les fenêtres.",
  );
});

test("un créateur choisit « Autre », saisit un lieu libre et publie, averti de l'heure de calme", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);
  const titre = `Veillée contes ${Date.now()}`;

  await seConnecter(page, resident.email);
  await commencerProposition(page, titre);

  await expect(page.getByLabel("Lieu", { exact: true })).toHaveValue("");
  await page.getByLabel("Heure de début").selectOption("21:00");
  await page.getByLabel("Heure de fin").selectOption("22:30");
  await continuerProposer(page);
  if (estBureau(page))
    await page.getByRole("button", { name: "Publier l'activité" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choisissez où se tient l'activité.",
  );
  await saisirLieuLibre(page, "Chez Danielle, 2e étage");
  await continuerProposer(page);

  await etapeProposer(page, 3);
  await continuerProposer(page);
  await etapeProposer(page, 4);
  await expect(page.getByRole("main")).toContainText(
    "Votre activité finit après 22h00, l'heure de calme de la résidence",
  );
  await page.screenshot({
    path: test.info().outputPath("recapitulatif-calme.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /^Publier/ }).click();

  await page.getByRole("link", { name: "Voir la fiche" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: titre }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Chez Danielle, 2e étage");
  await expect(page.getByRole("main")).not.toContainText(
    "Consignes de l'espace commun",
  );
});
