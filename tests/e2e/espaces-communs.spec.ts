import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { lireSupabaseLocal } from "../../scripts/supabase-local.mjs";
import {
  choisirDate,
  continuerProposer,
  encartAssistant,
  estBureau,
  etapeProposer,
  identifiantEspaceCommun,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelEspaceCommun,
  nouvelleActivite,
  saisirLieuLibre,
  supprimerComptes,
  supprimerEspacesCommuns,
} from "./outils";
import { jourDeParis } from "./jours";

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
  await choisirDate(page, jourDeParis(30));
}

test("le conseil syndical ajoute, modifie puis supprime un espace commun", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const nom = `Salle des fêtes ${randomUUID().slice(0, 6)}`;
  espaces.push(nom);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs");
  await expect(
    page.getByRole("heading", { level: 1, name: "Espaces communs" }),
  ).toBeVisible();

  // Ticket #173 : sur ordinateur, le bouton d'ajout est en tête et dit « Nouvel espace ».
  await page
    .getByRole("link", {
      name: isMobile ? "Ajouter un espace commun" : "Nouvel espace",
    })
    .click();
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
  await page.getByLabel("Longueur (en mètres)").fill("8");
  await page.getByLabel("Largeur (en mètres)").fill("6,5");
  await page.getByLabel("Hauteur sous plafond (en mètres)").fill("2.7");
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
  // Les mesures reviennent avec une virgule décimale.
  await expect(page.getByLabel("Longueur (en mètres)")).toHaveValue("8");
  await expect(page.getByLabel("Largeur (en mètres)")).toHaveValue("6,5");
  await expect(page.getByLabel("Hauteur sous plafond (en mètres)")).toHaveValue(
    "2,7",
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

test("les dimensions et la hauteur sous plafond : plages vérifiées avant l'envoi, un résident les lit sur la fiche, les vider les retire", async ({
  page,
  browser,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const nom = `Atelier ${randomUUID().slice(0, 6)}`;
  espaces.push(nom);
  const enregistrer = () =>
    page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const erreur = (texte: string) =>
    expect(page.getByRole("main").getByRole("alert")).toContainText(texte);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs/nouveau");
  await page.getByLabel("Nom").fill(nom);

  await page.getByLabel("Longueur (en mètres)").fill("8");
  await enregistrer();
  await erreur("Indiquez aussi la largeur, ou videz la longueur.");

  await page.getByLabel("Largeur (en mètres)").fill("150");
  await enregistrer();
  await erreur("Indiquez une largeur de 0,5 à 100 m.");

  await page.getByLabel("Largeur (en mètres)").fill("6");
  await page.getByLabel("Hauteur sous plafond (en mètres)").fill("20");
  await enregistrer();
  await erreur("Indiquez une hauteur de 1 à 15 m.");

  await page.getByLabel("Hauteur sous plafond (en mètres)").fill("2,7");
  await page.screenshot({
    path: test.info().outputPath("formulaire-espace-mesures.png"),
    fullPage: true,
  });
  await enregistrer();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est ajouté aux espaces communs.`,
  );

  // Un résident lit la surface et la hauteur sur la fiche.
  const id = await identifiantEspaceCommun(nom);
  const {
    baseURL,
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
  } = test.info().project.use;
  const contexte = await browser.newContext({
    baseURL,
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
    locale: "fr-FR",
  });
  const lecteur = await contexte.newPage();
  try {
    await seConnecter(lecteur, resident.email);
    await lecteur.goto(`/ma-copro/espaces/${id}`);
    await expect(lecteur.getByRole("main")).toContainText(
      "8 m × 6 m, soit 48 m²",
    );
    await expect(lecteur.getByRole("main")).toContainText("2,7 m");

    // Vider les trois champs retire les lignes de la fiche.
    await page.getByRole("link", { name: `Modifier : ${nom}` }).click();
    for (const libelle of [
      "Longueur (en mètres)",
      "Largeur (en mètres)",
      "Hauteur sous plafond (en mètres)",
    ])
      await page.getByLabel(libelle).fill("");
    await enregistrer();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      `« ${nom} » est enregistré.`,
    );
    await lecteur.reload();
    await expect(lecteur.getByRole("main")).not.toContainText("Dimensions");
    await expect(lecteur.getByRole("main")).not.toContainText(
      "Hauteur sous plafond",
    );
  } finally {
    await contexte.close();
  }
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
    date_activite: jourDeParis(30),
    heure_debut: "19:00",
    heure_fin: "20:00",
    espace_commun_id: espace.id,
    capacite_max: 6,
  });
  const titre = `Soirée jeux ${Date.now()}`;

  await seConnecter(page, resident.email);
  await commencerProposition(page, titre);

  // Le lieu se choisit dans une liste : espaces de la résidence puis « Ailleurs… ». Sous l'espace
  // choisi : sa capacité, ses badges et ses consignes.
  const lieu = page.getByLabel("Lieu", { exact: true });
  await expect(lieu.locator("option").last()).toHaveText("Ailleurs…");
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

type EspaceCommun = Awaited<ReturnType<typeof nouvelEspaceCommun>>;

/** Ce que le conseil syndical change à un espace commun entre la saisie d'un résident et sa publication. */
async function changerEspaceCommun(
  id: string,
  champs: { heure_fin_max?: string; capacite?: number },
) {
  const local = lireSupabaseLocal();
  const admin = createClient(local.url, local.cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin
    .from("espace_commun")
    .update(champs)
    .eq("id", id);
  if (error) throw error;
}

/** Saisit une proposition valide dans l'espace commun, jusqu'à « Publier » (récapitulatif sur mobile, page unique sur ordinateur). */
async function saisirDansEspaceCommun(
  page: Page,
  titre: string,
  espace: EspaceCommun,
) {
  await commencerProposition(page, titre);
  await page.getByLabel("Lieu", { exact: true }).selectOption({
    label: espace.nom,
  });
  await page.getByLabel("Heure de début").selectOption("19:00");
  await page.getByLabel("Heure de fin").selectOption("20:30");
  await continuerProposer(page);
  await etapeProposer(page, 3);
  await page.getByRole("radio", { name: "Limité", exact: true }).check();
  await page.getByLabel("Nombre de places").fill("8");
  await continuerProposer(page);
  await etapeProposer(page, 4);
}

const REFUS_DE_LA_BASE = [
  {
    cas: "l'heure de fermeture de l'espace commun avancée après la saisie",
    changement: (espace: EspaceCommun) =>
      changerEspaceCommun(espace.id, { heure_fin_max: "20:00" }),
    message:
      "L'activité finit après l'heure de fermeture de l'espace commun. Corrigez l'heure de fin.",
  },
  {
    cas: "la capacité de l'espace commun réduite après la saisie",
    changement: (espace: EspaceCommun) =>
      changerEspaceCommun(espace.id, { capacite: 5 }),
    message:
      "L'activité a plus de places que l'espace commun n'en accueille. Corrigez le nombre de places.",
  },
  {
    cas: "l'espace commun supprimé après la saisie",
    changement: async (espace: EspaceCommun) =>
      supprimerEspacesCommuns([espace.nom]),
    message: "Cet espace commun n'existe plus. Choisissez un autre lieu.",
  },
];

for (const refus of REFUS_DE_LA_BASE) {
  test(`quand la base refuse la publication (${refus.cas}), le message ne renvoie à aucune étape`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const espace = await nouvelEspaceCommun();
    espaces.push(espace.nom);

    await seConnecter(page, resident.email);
    await saisirDansEspaceCommun(page, `Soirée refusée ${Date.now()}`, espace);
    await refus.changement(espace);
    await page.getByRole("button", { name: /^Publier/ }).click();

    const alerte = page
      .getByRole("main")
      .getByRole("alert")
      .filter({ hasText: refus.message });
    await expect(alerte).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Revenez à l'étape");
  });
}
