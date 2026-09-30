import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  reglerAffichage,
  supprimerComptes,
  titreAccueil,
  verifierSansDefilementHorizontal,
} from "./outils";

// Décision du 29/09/2026 (spec #125) : jamais de barre de défilement horizontale, sur aucun écran
// ni aucun réglage d'affichage, en largeur mobile comme en ordinateur (les deux projets Playwright).

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

const ECRANS = [
  ["Accueil", "/"],
  ["Activités", "/activites"],
  ["Annonces", "/annonces"],
  ["Proposer", "/proposer"],
  ["Ma copro", "/ma-copro"],
  ["Profil", "/profil"],
  ["Mon syndic", "/mon-syndic"],
] as const;

const REGLAGES = [
  ["clair", { theme: "clair", taille: "standard" }],
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands caractères", { theme: "clair", taille: "grands" }],
] as const;

async function seConnecter(
  page: Page,
  compte: { id: string; email: string },
  reglages: (typeof REGLAGES)[number][1],
) {
  emails.push(compte.email);
  await reglerAffichage(compte.id, reglages);
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(compte.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function residentConnecte(
  page: Page,
  reglages: (typeof REGLAGES)[number][1],
) {
  await seConnecter(page, await nouveauResident("valide"), reglages);
  await titreAccueil(page).waitFor();
}

// Espace syndic (ticket #169) : listes et formulaires, aux trois largeurs du menu (tiroir du
// mobile, rail de 64 à 80 rem, menu déplié au-delà).
const ECRANS_DU_SYNDIC = [
  "/syndic/tableau-de-bord",
  "/syndic/residents",
  "/syndic/membres",
  "/syndic/moderation",
  "/syndic/annonces",
  "/syndic/annonces/nouvelle",
  "/syndic/espaces-communs",
  "/syndic/espaces-communs/nouveau",
  "/syndic/reglement",
  "/syndic/reglement/nouvelle",
  "/syndic/mon-syndic",
  "/syndic/mon-syndic/nouvelle",
];

for (const [reglage, valeurs] of REGLAGES) {
  test(`aucun écran ne défile horizontalement, en ${reglage}`, async ({
    page,
  }) => {
    await residentConnecte(page, valeurs);

    for (const [nom, chemin] of ECRANS) {
      await test.step(nom, async () => {
        await page.goto(chemin);
        await page.getByRole("heading", { level: 1 }).first().waitFor();
        await verifierSansDefilementHorizontal(page);
      });
    }
  });
}

for (const [reglage, valeurs] of REGLAGES) {
  test(`aucun écran de l'espace syndic ne défile horizontalement, en ${reglage}`, async ({
    page,
    isMobile,
  }) => {
    await seConnecter(page, await nouveauSyndic(), valeurs);
    await expect(page).not.toHaveURL(/connexion/);

    // Mobile : la largeur du projet ; ordinateur : le rail (1100 px) puis le menu déplié (1440 px).
    const largeurs = isMobile ? [null] : [1100, 1440];
    for (const largeur of largeurs) {
      if (largeur) await page.setViewportSize({ width: largeur, height: 900 });
      for (const chemin of ECRANS_DU_SYNDIC) {
        await test.step(`${chemin}, ${largeur ?? "mobile"}`, async () => {
          await page.goto(chemin);
          await page.getByRole("heading", { level: 1 }).first().waitFor();
          await verifierSansDefilementHorizontal(page);
        });
      }
    }
  });
}
