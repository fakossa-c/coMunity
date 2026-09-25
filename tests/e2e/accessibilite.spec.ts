import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouvelleActivite,
  supprimerComptes,
} from "./outils";

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
}

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page }).include("main").analyze();
  const critiques = resultat.violations.filter((v) => v.impact === "critical");
  expect(critiques, JSON.stringify(critiques, null, 2)).toEqual([]);
}

/** Accueil, fiche, Activités, Annonces et Profil : les 5 écrans exigés par le ticket #19. */
async function chaqueEcran(resident: string) {
  const identifiant = await nouvelleActivite(resident);
  return [
    "/",
    `/activites/${identifiant}`,
    "/activites",
    "/annonces",
    "/profil",
  ];
}

for (const theme of ["clair", "sombre"] as const) {
  test.describe(`en thème ${theme}`, () => {
    test(`aucune violation critique sur les 5 écrans`, async ({ page }) => {
      const compte = await nouveauResident("valide");
      emails.push(compte.email);
      await seConnecter(page, compte.email);

      if (theme === "sombre") {
        // Réglage enregistré comme le ferait la personne, pour que chaque navigation
        // (rendu serveur) porte l'attribut, écran par écran. L'enregistrement se fait en
        // arrière-plan (action serveur, POST sur la page) : attendu avant de naviguer.
        await page.goto("/profil/reglages");
        const enregistre = page.waitForResponse(
          (reponse) =>
            reponse.url() === page.url() &&
            reponse.request().method() === "POST",
        );
        await page.getByRole("radio", { name: "Sombre" }).click();
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          "sombre",
        );
        await enregistre;
      }

      const ecrans = await chaqueEcran(compte.id);
      for (const chemin of ecrans) {
        await page.goto(chemin);
        if (theme === "sombre") {
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "sombre",
          );
        }
        await auditer(page);
      }
    });
  });
}
