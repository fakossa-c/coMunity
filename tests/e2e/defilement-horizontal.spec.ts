import { test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
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

async function residentConnecte(
  page: Page,
  reglages: (typeof REGLAGES)[number][1],
) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await reglerAffichage(resident.id, reglages);
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(resident.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await titreAccueil(page).waitFor();
}

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
