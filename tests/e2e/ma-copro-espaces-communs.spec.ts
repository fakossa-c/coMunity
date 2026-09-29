import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouvelEspaceCommun,
  nouveauResident,
  nouveauSyndic,
  reglerAffichage,
  supprimerComptes,
  supprimerEspacesCommuns,
} from "./outils";

// Ticket #55 : les espaces communs définis par le conseil syndical (#11) se lisent dans Ma copro,
// sous le règlement intérieur.

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

/** La section Espaces communs de Ma copro. */
function sectionEspaces(page: Page) {
  return page.getByRole("region", { name: "Espaces communs" });
}

/** La carte d'un espace commun dans Ma copro, retrouvée par son nom. */
function carte(page: Page, nom: string) {
  return sectionEspaces(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: nom }) });
}

test("le conseil syndical crée un espace commun avec horaires et contact, un résident le retrouve dans Ma copro, à jour après une modification", async ({
  page,
  browser,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const nom = `Salle des fêtes ${randomUUID().slice(0, 6)}`;
  espaces.push(nom);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs/nouveau");
  await page.getByLabel("Nom").fill(nom);
  await page.getByLabel("Bâtiment").fill("Bâtiment A");
  await page
    .getByLabel("Localisation")
    .fill("Rez-de-chaussée, au fond du hall");
  await page.getByLabel("Capacité").fill("20");
  await page.getByRole("checkbox", { name: "Coin cuisine" }).check();
  await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
  await page.getByLabel("Consignes").fill("Laissez la salle propre.");
  await page.getByLabel("Horaires d'accès").fill("Tous les jours de 9h à 21h");
  await page.getByLabel("Contact").fill("Colette, gardienne");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est ajouté aux espaces communs.`,
  );

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
    await lecteur.goto("/ma-copro");
    await expect(
      lecteur.getByRole("heading", { level: 2, name: "Règlement intérieur" }),
    ).toBeVisible();
    await expect(
      lecteur.getByRole("heading", { level: 2, name: "Espaces communs" }),
    ).toBeVisible();

    const fiche = carte(lecteur, nom);
    await expect(fiche).toContainText("Bâtiment A");
    await expect(fiche).toContainText("Rez-de-chaussée, au fond du hall");
    await expect(fiche).toContainText("Tous les jours de 9h à 21h");
    await expect(fiche).toContainText("Colette, gardienne");
    await expect(fiche).toContainText("Jusqu'à 20 personnes");
    await expect(fiche).toContainText("Laissez la salle propre.");
    await expect(
      fiche.getByRole("list", { name: "Équipements" }).getByRole("listitem"),
    ).toHaveText(["Accès plain-pied", "Coin cuisine"]);
    // Sous le règlement intérieur.
    const [yReglement, yEspaces] = await Promise.all([
      lecteur
        .getByRole("heading", { level: 2, name: "Règlement intérieur" })
        .boundingBox(),
      lecteur
        .getByRole("heading", { level: 2, name: "Espaces communs" })
        .boundingBox(),
    ]);
    expect(yReglement!.y).toBeLessThan(yEspaces!.y);
    await lecteur.screenshot({
      path: test.info().outputPath("ma-copro-espaces.png"),
      fullPage: true,
    });

    // Le conseil syndical modifie l'espace : Ma copro le montre à jour au rechargement.
    await page.goto("/syndic/espaces-communs");
    await page.getByRole("link", { name: `Modifier : ${nom}` }).click();
    await page.getByLabel("Contact").fill("Bernard, président du conseil");
    await page.getByLabel("Capacité").fill("25");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      `« ${nom} » est enregistré.`,
    );

    await lecteur.reload();
    await expect(carte(lecteur, nom)).toContainText(
      "Bernard, président du conseil",
    );
    await expect(carte(lecteur, nom)).toContainText("Jusqu'à 25 personnes");
    await expect(carte(lecteur, nom)).not.toContainText("Colette, gardienne");
  } finally {
    await contexte.close();
  }
});

test("un champ non renseigné n'apparaît pas dans la carte de l'espace", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun({
    batiment: null,
    capacite: null,
    equipements: [],
    heure_fin_max: null,
    consignes: null,
  });
  espaces.push(espace.nom);

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");

  const fiche = carte(page, espace.nom);
  await expect(fiche).toBeVisible();
  await expect(fiche).toHaveText(espace.nom);
  await expect(fiche.getByText("Horaires d'accès")).toHaveCount(0);
  await expect(fiche.getByText("Contact")).toHaveCount(0);
  await expect(fiche.getByText("Capacité")).toHaveCount(0);
  await expect(fiche.getByText("Consignes")).toHaveCount(0);
  await expect(fiche.getByRole("list", { name: "Équipements" })).toHaveCount(0);
});

test("un résident en attente de validation et le conseil syndical lisent les espaces communs", async ({
  page,
  browser,
}) => {
  const attente = await nouveauResident("en_attente");
  const syndic = await nouveauSyndic();
  emails.push(attente.email, syndic.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);

  await seConnecter(page, attente.email);
  await page.goto("/ma-copro");
  await expect(carte(page, espace.nom)).toBeVisible();

  const contexte = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    locale: "fr-FR",
  });
  const membre = await contexte.newPage();
  try {
    await seConnecter(membre, syndic.email);
    await membre.goto("/ma-copro");
    await expect(carte(membre, espace.nom)).toBeVisible();
  } finally {
    await contexte.close();
  }
});

test("un résident refusé ne lit pas les espaces communs, un visiteur est conduit à la connexion", async ({
  page,
  browser,
}) => {
  const resident = await nouveauResident("refuse");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");
  await expect(page.getByRole("main")).toContainText("Compte non accepté");
  await expect(page.getByRole("main")).not.toContainText(espace.nom);

  const contexte = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const visiteur = await contexte.newPage();
  try {
    await visiteur.goto("/ma-copro");
    await expect(visiteur).toHaveURL(/\/connexion\?suivant=%2Fma-copro/);
  } finally {
    await contexte.close();
  }
});

for (const theme of ["clair", "sombre"] as const) {
  test(`les espaces communs sont lisibles en grands caractères et en thème ${theme}, sans violation d'accessibilité`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const espace = await nouvelEspaceCommun({
      localisation: "Rez-de-chaussée, à gauche du hall",
      description: "Une grande pièce claire avec une cuisine.",
      horaires_acces: "Tous les jours de 9h à 21h",
      contact: "Colette, gardienne : 06 12 34 56 78",
    });
    espaces.push(espace.nom);
    await reglerAffichage(resident.id, { theme, taille: "grands" });

    await seConnecter(page, resident.email);
    await page.goto("/ma-copro");
    if (theme === "sombre")
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        "sombre",
      );
    await expect(page.locator("html")).toHaveAttribute("data-taille", "grands");
    await expect(carte(page, espace.nom)).toBeVisible();

    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`ma-copro-espaces-${theme}-grands.png`),
      fullPage: true,
    });
  });
}
