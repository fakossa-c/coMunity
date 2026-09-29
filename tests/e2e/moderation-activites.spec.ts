import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  masquerActivite,
  mettreEnRelecture,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  supprimerComptes,
} from "./outils";

// Ticket #14 : le conseil syndical relit, publie, refuse, masque, rétablit, modifie et annule les
// activités ; une activité en relecture ou masquée n'est visible que de son créateur et du conseil
// syndical, lien public compris ; le créateur voit l'état et le message.

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

/** Une page d'un autre appareil, connectée : le créateur pendant que le conseil syndical agit. */
async function pageConnectee(browser: Browser, email: string) {
  const contexte = await browser.newContext({ locale: "fr-FR" });
  const page = await contexte.newPage();
  await seConnecter(page, email);
  return page;
}

function titreUnique() {
  return `Vente de savons ${randomUUID().slice(0, 6)}`;
}

/** Un créateur, une activité qu'il a publiée, et un membre du conseil syndical connecté sur `page`. */
async function activiteAModerer(page: Page) {
  const createur = await nouveauResident("valide");
  const syndic = await nouveauSyndic();
  emails.push(createur.email, syndic.email);
  const titre = titreUnique();
  const identifiant = await nouvelleActivite(createur.id, { titre });
  await seConnecter(page, syndic.email);
  return { createur, syndic, titre, identifiant };
}

function carte(page: Page, titre: string) {
  return page.getByRole("listitem").filter({ hasText: titre });
}

test("la liste « À relire » donne la raison, et publier avec un message informe le créateur", async ({
  page,
  browser,
}) => {
  const { createur, titre, identifiant } = await activiteAModerer(page);
  await mettreEnRelecture(identifiant, "Le titre ressemble à une vente");

  await page.goto("/syndic/moderation");

  await expect(
    page.getByRole("heading", { level: 1, name: "Modération des activités" }),
  ).toBeVisible();
  const ligne = carte(page, titre);
  await expect(ligne).toContainText("En relecture");
  await expect(ligne).toContainText("Danielle M.");
  await expect(ligne).toContainText("Raison : Le titre ressemble à une vente");
  await page.screenshot({
    path: test.info().outputPath("a-relire.png"),
    fullPage: true,
  });

  await ligne.getByRole("button", { name: /^Publier/ }).click();
  const feuille = page.getByRole("dialog", {
    name: "Publier cette activité ?",
  });
  await feuille
    .getByLabel("Message pour le créateur (facultatif)")
    .fill("C'est bon, merci d'avoir précisé le lieu.");
  await feuille.getByRole("button", { name: "Publier", exact: true }).click();

  await expect(page.getByText(`« ${titre} » est publiée.`)).toBeVisible();
  await expect(carte(page, titre)).toHaveCount(0);

  const pageCreateur = await pageConnectee(browser, createur.email);
  await pageCreateur.goto(`/activites/${identifiant}`);
  const decision = pageCreateur.getByRole("region", {
    name: "Message du conseil syndical",
  });
  await expect(decision).toContainText(
    "C'est bon, merci d'avoir précisé le lieu.",
  );
  await pageCreateur.context().close();
});

test("refuser demande un message, masque l'activité et le créateur lit la décision", async ({
  page,
  browser,
}) => {
  const { createur, titre, identifiant } = await activiteAModerer(page);
  await mettreEnRelecture(identifiant, "Titre commercial");

  await page.goto("/syndic/moderation");
  await carte(page, titre)
    .getByRole("button", { name: /^Refuser/ })
    .click();
  const feuille = page.getByRole("dialog", {
    name: "Refuser cette activité ?",
  });
  await feuille.getByRole("button", { name: "Refuser", exact: true }).click();
  await expect(
    feuille.getByText(
      "Écrivez un message pour expliquer votre décision au créateur.",
    ),
  ).toBeVisible();

  await feuille
    .getByLabel("Message pour le créateur")
    .fill("Les ventes ne sont pas des activités de voisinage.");
  await feuille.getByRole("button", { name: "Refuser", exact: true }).click();

  await expect(page.getByText(`« ${titre} » est refusée.`)).toBeVisible();
  const masquees = carte(page, titre);
  await expect(masquees).toContainText("Masquée");
  await expect(masquees).toContainText(
    "Les ventes ne sont pas des activités de voisinage.",
  );

  const pageCreateur = await pageConnectee(browser, createur.email);
  await pageCreateur.goto(`/activites/${identifiant}`);
  await expect(
    pageCreateur.getByText("Masquée par le conseil syndical"),
  ).toBeVisible();
  await expect(
    pageCreateur.getByRole("region", { name: "Message du conseil syndical" }),
  ).toContainText("Les ventes ne sont pas des activités de voisinage.");
  await pageCreateur.context().close();
});

test("une activité en relecture ou masquée n'est visible ni des voisins ni d'un visiteur, lien public compris", async ({
  page,
  browser,
}) => {
  const { createur, titre, identifiant } = await activiteAModerer(page);
  const voisin = await nouveauResident("valide");
  emails.push(voisin.email);
  await mettreEnRelecture(identifiant, "À relire");
  const lien = `/activites/${identifiant}`;

  // Le créateur voit son activité en relecture, avec l'état.
  const pageCreateur = await pageConnectee(browser, createur.email);
  await pageCreateur.goto(lien);
  await expect(pageCreateur.getByRole("heading", { level: 1 })).toHaveText(
    titre,
  );
  await expect(pageCreateur.getByText("En relecture").first()).toBeVisible();
  await expect(
    pageCreateur.getByText("Le conseil syndical relit votre activité"),
  ).toBeVisible();

  // Le membre du conseil syndical voit l'activité en relecture.
  await page.goto(lien);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(titre);

  // Un voisin et un visiteur ne voient qu'une page introuvable, en relecture puis masquée.
  const pageVoisin = await pageConnectee(browser, voisin.email);
  await pageVoisin.goto(lien);
  await expect(
    pageVoisin.getByRole("heading", { level: 1, name: "Activité introuvable" }),
  ).toBeVisible();
  const contexteVisiteur = await browser.newContext({ locale: "fr-FR" });
  const visiteur = await contexteVisiteur.newPage();
  await visiteur.goto(lien);
  await expect(
    visiteur.getByRole("heading", { level: 1, name: "Activité introuvable" }),
  ).toBeVisible();

  await masquerActivite(identifiant, "Hors sujet");
  await visiteur.goto(lien);
  await expect(
    visiteur.getByRole("heading", { level: 1, name: "Activité introuvable" }),
  ).toBeVisible();
  await pageVoisin.goto("/");
  await expect(pageVoisin.getByText(titre)).toHaveCount(0);
  await pageCreateur.goto(lien);
  await expect(
    pageCreateur.getByText("Masquée par le conseil syndical"),
  ).toBeVisible();

  await contexteVisiteur.close();
  await pageVoisin.context().close();
  await pageCreateur.context().close();
});

test("le conseil syndical masque puis rétablit une activité depuis sa fiche, avec un message", async ({
  page,
  browser,
}) => {
  const { createur, titre, identifiant } = await activiteAModerer(page);
  const lien = `/activites/${identifiant}`;

  await page.goto(lien);
  const moderation = page.getByRole("region", {
    name: "Modération par le conseil syndical",
  });
  await moderation.getByRole("button", { name: "Masquer" }).click();
  const feuille = page.getByRole("dialog", {
    name: "Masquer cette activité ?",
  });
  await feuille
    .getByLabel("Message pour le créateur")
    .fill("Un voisin l'a signalée, nous vérifions.");
  await feuille.getByRole("button", { name: "Masquer", exact: true }).click();

  await expect(moderation.getByText("Masquée", { exact: true })).toBeVisible();
  // Annulée, une activité masquée deviendrait publique : le bouton n'est là qu'une fois rétablie.
  await expect(
    moderation.getByRole("button", { name: "Annuler l'activité" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("fiche-masquee.png"),
    fullPage: true,
  });
  const pageCreateur = await pageConnectee(browser, createur.email);
  await pageCreateur.goto(lien);
  await expect(
    pageCreateur.getByRole("region", { name: "Message du conseil syndical" }),
  ).toContainText("Un voisin l'a signalée, nous vérifions.");

  await moderation.getByRole("button", { name: "Rétablir" }).click();
  await expect(
    moderation.getByRole("button", { name: "Annuler l'activité" }),
  ).toBeVisible();
  await expect(
    moderation.getByRole("button", { name: "Masquer" }),
  ).toBeVisible();
  await pageCreateur.goto(lien);
  await expect(pageCreateur.getByRole("heading", { level: 1 })).toHaveText(
    titre,
  );
  await expect(
    pageCreateur.getByText("Masquée par le conseil syndical"),
  ).toHaveCount(0);
  await expect(
    pageCreateur.getByRole("region", { name: "Message du conseil syndical" }),
  ).toHaveCount(0);
  await pageCreateur.context().close();
});

test("le conseil syndical modifie l'activité d'un résident, puis l'annule", async ({
  page,
}) => {
  const { titre, identifiant } = await activiteAModerer(page);
  const lien = `/activites/${identifiant}`;

  await page.goto(lien);
  await page
    .getByRole("region", { name: "Modération par le conseil syndical" })
    .getByRole("link", { name: "Modifier" })
    .click();
  await expect(page.getByLabel("Titre de l'activité")).toHaveValue(titre);
  await page.getByLabel("Titre de l'activité").fill(`${titre} corrigée`);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(new RegExp(`${lien}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `${titre} corrigée`,
  );

  await page
    .getByRole("region", { name: "Modération par le conseil syndical" })
    .getByRole("button", { name: "Annuler l'activité" })
    .click();
  await page
    .getByRole("dialog", { name: "Annuler cette activité ?" })
    .getByRole("button", { name: "Annuler l'activité" })
    .click();
  await expect(page.getByText("Annulée").first()).toBeVisible();
});

test("un résident n'a pas accès à la modération", async ({ page }) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);

  await page.goto("/syndic/moderation");

  await expect(
    page.getByText("Cet espace est réservé aux membres du conseil syndical."),
  ).toBeVisible();
});

test("l'espace syndic annonce les activités à relire", async ({ page }) => {
  const { identifiant } = await activiteAModerer(page);
  await mettreEnRelecture(identifiant, "À relire");

  await page.goto("/syndic");
  const rubrique = page.getByRole("link", { name: /Modération des activités/ });

  await expect(rubrique).toContainText(/activités? à relire/);
  await rubrique.click();
  await expect(page).toHaveURL(/\/syndic\/moderation$/);
});

test("aucune violation critique d'accessibilité sur la liste et les fiches modérées", async ({
  page,
  browser,
}) => {
  const { createur, titre, identifiant } = await activiteAModerer(page);
  await mettreEnRelecture(identifiant, "Le titre ressemble à une vente");
  const auditer = async (lecteur: Page) => {
    const resultat = await new AxeBuilder({ page: lecteur })
      .include("main")
      .analyze();
    const critiques = resultat.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critiques, JSON.stringify(critiques, null, 2)).toEqual([]);
  };

  await page.goto("/syndic/moderation");
  await expect(carte(page, titre)).toBeVisible();
  await auditer(page);
  await page.goto(`/activites/${identifiant}`);
  await expect(
    page.getByRole("region", { name: "Modération par le conseil syndical" }),
  ).toBeVisible();
  await auditer(page);
  await page.screenshot({
    path: test.info().outputPath("fiche-en-relecture-conseil.png"),
    fullPage: true,
  });

  const pageCreateur = await pageConnectee(browser, createur.email);
  await pageCreateur.goto(`/activites/${identifiant}`);
  await expect(pageCreateur.getByText("En relecture").first()).toBeVisible();
  await auditer(pageCreateur);
  await pageCreateur.screenshot({
    path: test.info().outputPath("fiche-en-relecture-createur.png"),
    fullPage: true,
  });
  await pageCreateur.context().close();
});
