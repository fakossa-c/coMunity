import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  masquerActivite,
  mettreEnRelecture,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelEspaceCommun,
  nouvelleActivite,
  nouvelleAnnonce,
  reglerAffichage,
  supprimerAnnonces,
  supprimerComptes,
  supprimerEspacesCommuns,
  verifierSansDefilementHorizontal,
} from "./outils";

// Spec #168, ticket #173 : sur ordinateur, les listes de l'espace syndic passent en grille
// (modération sur deux à trois colonnes, annonces sur deux, espaces communs sur trois) et le
// bouton d'ajout remonte en tête de page ; sur mobile, rien ne change.

const emails: string[] = [];
const annonces: string[] = [];
const espaces: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerAnnonces(annonces.splice(0));
  await supprimerEspacesCommuns(espaces.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

/** Un membre du conseil syndical connecté, et de quoi remplir chaque grille. */
async function syndicAvecDesListes(page: Page) {
  const syndic = await nouveauSyndic();
  const createur = await nouveauResident("valide");
  emails.push(syndic.email, createur.email);
  const suffixe = randomUUID().slice(0, 6);
  for (const rang of [1, 2, 3]) {
    const identifiant = await nouvelleActivite(createur.id, {
      titre: `À relire ${rang} ${suffixe}`,
    });
    await mettreEnRelecture(identifiant, "Mot signalé");
  }
  await masquerActivite(
    await nouvelleActivite(createur.id, { titre: `Masquée ${suffixe}` }),
    "Hors sujet",
  );
  for (const rang of [1, 2]) {
    const { titre } = await nouvelleAnnonce({
      titre: `Annonce ${rang} ${suffixe}`,
    });
    annonces.push(titre);
  }
  for (const rang of [1, 2, 3]) {
    const { nom } = await nouvelEspaceCommun({
      nom: `Espace ${rang} ${suffixe}`,
    });
    espaces.push(nom);
  }
  await seConnecter(page, syndic.email);
  return { syndic, createur, suffixe };
}

/** Les cartes d'une liste, rangées par colonne : le nombre de colonnes qu'elles occupent. */
async function colonnes(liste: Locator) {
  await expect(liste.locator(":scope > li").first()).toBeVisible();
  return liste
    .locator(":scope > li")
    .evaluateAll(
      (cartes) =>
        new Set(cartes.map((c) => Math.round(c.getBoundingClientRect().left)))
          .size,
    );
}

async function haut(element: Locator) {
  return (await element.boundingBox())!.y;
}

function boutonAjout(page: Page, nom: string) {
  return page.getByRole("link", { name: nom, exact: true });
}

test.describe("sur ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "Grilles propres à l'ordinateur.");

  for (const largeur of [1280, 1100]) {
    test(`à ${largeur} px, les listes sont en grille et le bouton d'ajout en tête, sans défilement horizontal`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await syndicAvecDesListes(page);

      await page.goto("/syndic/moderation");
      const aRelire = page.getByRole("list", { name: "À relire" });
      const nombre = await colonnes(aRelire);
      expect(nombre).toBeGreaterThanOrEqual(2);
      expect(nombre).toBeLessThanOrEqual(3);
      await expect(
        page
          .getByRole("list", { name: "Masquées" })
          .getByRole("button", { name: /^Rétablir/ })
          .first(),
      ).toBeVisible();
      await verifierSansDefilementHorizontal(page);

      await page.goto("/syndic/annonces");
      const listeAnnonces = page.getByRole("list", {
        name: "Annonces publiées",
      });
      expect(await colonnes(listeAnnonces)).toBe(2);
      const nouvelleAnnonceLien = boutonAjout(page, "Nouvelle annonce");
      await expect(nouvelleAnnonceLien).toHaveCount(1);
      expect(await haut(nouvelleAnnonceLien)).toBeLessThan(
        await haut(listeAnnonces),
      );
      await expect(boutonAjout(page, "Publier une annonce")).toHaveCount(0);
      await verifierSansDefilementHorizontal(page);

      await page.goto("/syndic/espaces-communs");
      const listeEspaces = page.getByRole("list", { name: "Espaces communs" });
      expect(await colonnes(listeEspaces)).toBe(3);
      const nouvelEspaceLien = boutonAjout(page, "Nouvel espace");
      await expect(nouvelEspaceLien).toHaveCount(1);
      expect(await haut(nouvelEspaceLien)).toBeLessThan(
        await haut(page.getByLabel("Heure de calme")),
      );
      expect(await haut(page.getByLabel("Heure de calme"))).toBeLessThan(
        await haut(listeEspaces),
      );
      await expect(boutonAjout(page, "Ajouter un espace commun")).toHaveCount(
        0,
      );
      await verifierSansDefilementHorizontal(page);
    });
  }

  test("sur un grand écran, les activités à relire passent sur trois colonnes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await syndicAvecDesListes(page);
    await page.goto("/syndic/moderation");
    expect(await colonnes(page.getByRole("list", { name: "À relire" }))).toBe(
      3,
    );
    await verifierSansDefilementHorizontal(page);
  });

  test("les boutons d'ajout mènent aux formulaires", async ({ page }) => {
    await syndicAvecDesListes(page);
    await page.goto("/syndic/annonces");
    await boutonAjout(page, "Nouvelle annonce").click();
    await expect(page).toHaveURL(/\/syndic\/annonces\/nouvelle$/);
    await page.goto("/syndic/espaces-communs");
    await boutonAjout(page, "Nouvel espace").click();
    await expect(page).toHaveURL(/\/syndic\/espaces-communs\/nouveau$/);
  });

  test("en thème sombre et en grands caractères, les grilles restent sans défilement horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    const { syndic } = await syndicAvecDesListes(page);
    await reglerAffichage(syndic.id, { theme: "sombre", taille: "grands" });
    for (const chemin of [
      "/syndic/moderation",
      "/syndic/annonces",
      "/syndic/espaces-communs",
    ]) {
      await page.goto(chemin);
      await expect(page.locator("html")).toHaveAttribute(
        "data-taille",
        "grands",
      );
      await verifierSansDefilementHorizontal(page);
    }
  });
});

test.describe("sur mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "Mise en page mobile.");

  test("rien ne change : une colonne, le bouton d'ajout sous la liste", async ({
    page,
  }) => {
    await syndicAvecDesListes(page);

    await page.goto("/syndic/moderation");
    expect(await colonnes(page.getByRole("list", { name: "À relire" }))).toBe(
      1,
    );
    await verifierSansDefilementHorizontal(page);

    await page.goto("/syndic/annonces");
    const listeAnnonces = page.getByRole("list", { name: "Annonces publiées" });
    expect(await colonnes(listeAnnonces)).toBe(1);
    const publier = boutonAjout(page, "Publier une annonce");
    await expect(publier).toHaveCount(1);
    expect(await haut(publier)).toBeGreaterThan(await haut(listeAnnonces));
    await expect(boutonAjout(page, "Nouvelle annonce")).toHaveCount(0);
    await verifierSansDefilementHorizontal(page);

    await page.goto("/syndic/espaces-communs");
    const listeEspaces = page.getByRole("list", { name: "Espaces communs" });
    expect(await colonnes(listeEspaces)).toBe(1);
    const ajouter = boutonAjout(page, "Ajouter un espace commun");
    await expect(ajouter).toHaveCount(1);
    expect(await haut(ajouter)).toBeGreaterThan(await haut(listeEspaces));
    await expect(boutonAjout(page, "Nouvel espace")).toHaveCount(0);
    await verifierSansDefilementHorizontal(page);
  });
});

test("rétablir une activité masquée se fait depuis sa carte de la grille", async ({
  page,
}) => {
  const { suffixe } = await syndicAvecDesListes(page);
  await page.goto("/syndic/moderation");
  const carte = page
    .getByRole("list", { name: "Masquées" })
    .getByRole("listitem")
    .filter({ hasText: `Masquée ${suffixe}` });
  await carte.getByRole("button", { name: /^Rétablir/ }).click();
  await expect(
    page.getByText(`« Masquée ${suffixe} » est rétablie.`),
  ).toBeVisible();
});
