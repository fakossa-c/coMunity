import { expect, test, type Page } from "@playwright/test";
import {
  arriveeDuSyndic,
  lienRecu,
  modifierProfil,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelEmail,
  reglerAffichage,
  supprimerComptes,
  titreAccueil,
} from "./outils";

const NOUVEAU_MOT_DE_PASSE = "un-nouveau-mot-de-passe";
const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string, motDePasse: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

function listeDesMembres(page: Page) {
  return page.getByRole("list", { name: "Membres du conseil syndical" });
}

async function choisirMotDePasse(page: Page, motDePasse: string) {
  await page.getByLabel("Nouveau mot de passe").fill(motDePasse);
  await page.getByLabel("Confirmez le mot de passe").fill(motDePasse);
  await page
    .getByRole("button", { name: "Enregistrer le mot de passe" })
    .click();
}

test("un membre du syndic invite un collègue, qui saisit son prénom, son nom et son mot de passe, et arrive dans l'espace syndic", async ({
  page,
  browser,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  const collegue = nouvelEmail("collegue");
  emails.push(syndic.email, collegue);

  await seConnecter(page, syndic.email, MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();

  await page.goto("/syndic/membres");
  await expect(listeDesMembres(page)).toContainText(syndic.email);

  await page.getByLabel("Adresse email du collègue").fill(collegue);
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `Invitation envoyée à ${collegue}`,
  );
  await expect(listeDesMembres(page)).toContainText(collegue);

  // Le collègue ouvre l'email sur son propre appareil.
  const appareilDuCollegue = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const pageDuCollegue = await appareilDuCollegue.newPage();
  await pageDuCollegue.goto(await lienRecu(collegue));
  await expect(
    pageDuCollegue.getByRole("heading", {
      level: 1,
      name: "Choisissez votre mot de passe",
    }),
  ).toBeVisible();
  await pageDuCollegue.getByLabel("Prénom").fill("Bernard");
  await pageDuCollegue.getByLabel("Nom", { exact: true }).fill("Lefèvre");
  await pageDuCollegue.screenshot({
    path: test.info().outputPath("choix-du-mot-de-passe.png"),
    fullPage: true,
  });
  await choisirMotDePasse(pageDuCollegue, NOUVEAU_MOT_DE_PASSE);

  await expect(
    arriveeDuSyndic(pageDuCollegue, { mobile: isMobile }),
  ).toBeVisible();
  await pageDuCollegue.getByRole("button", { name: "Mon profil" }).click();
  await expect(
    pageDuCollegue.getByRole("dialog", { name: "Menu du profil" }),
  ).toContainText("Bernard L.");
  await page.screenshot({
    path: test.info().outputPath("membres-du-syndic.png"),
    fullPage: true,
  });
  await appareilDuCollegue.close();
});

test("sur ordinateur, la carte d'invitation est à côté de la liste des membres ; sur mobile, au-dessus", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email, MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();

  // Mobile : la largeur du projet ; ordinateur : le rail (1100 px) puis le menu déplié (1440 px).
  for (const largeur of isMobile ? [null] : [1100, 1440]) {
    if (largeur) await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/syndic/membres");
    const liste = (await listeDesMembres(page).boundingBox())!;
    const carte = (await page
      .getByRole("region", { name: "Inviter un collègue" })
      .boundingBox())!;
    if (isMobile) {
      expect(carte.y + carte.height).toBeLessThanOrEqual(liste.y);
    } else {
      expect(carte.x).toBeGreaterThanOrEqual(liste.x + liste.width);
      expect(carte.y).toBeLessThan(liste.y + liste.height);
    }
    await page.screenshot({
      path: test.info().outputPath(`membres-${largeur ?? "mobile"}.png`),
      fullPage: true,
    });
  }
});

test("l'adresse longue d'un collègue reste lisible à côté de « Retirer l'accès », même en grands caractères", async ({
  page,
  isMobile,
}) => {
  const [moi, collegue] = [await nouveauSyndic(), await nouveauSyndic()];
  emails.push(moi.email, collegue.email);
  // L'adresse d'origine reste celle du compte, que `supprimerComptes` retrouve.
  const adresse = nouvelEmail("bernard-lefevre-du-conseil-syndical");
  await modifierProfil(collegue.id, { email: adresse });
  await reglerAffichage(moi.id, { taille: "grands" });

  await seConnecter(page, moi.email, MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
  await page.goto("/syndic/membres");
  const ligne = listeDesMembres(page)
    .getByRole("listitem")
    .filter({ hasText: adresse });

  // L'adresse tient sur trois lignes au plus : le bouton ne l'écrase pas, elle ne s'empile pas
  // lettre par lettre (issue #180). Vrai aussi pendant la confirmation du retrait.
  async function adresseLisible() {
    const texte = ligne.getByText(adresse);
    const interligne = await texte.evaluate((element) =>
      parseFloat(getComputedStyle(element).lineHeight),
    );
    const hauteur = (await texte.boundingBox())!.height;
    expect(hauteur).toBeLessThanOrEqual(3 * interligne);
  }
  await adresseLisible();
  await page.screenshot({
    path: test.info().outputPath("membres-grands-caracteres.png"),
    fullPage: true,
  });
  await ligne.getByRole("button", { name: "Retirer l'accès" }).click();
  await expect(
    ligne.getByRole("button", { name: "Confirmer le retrait" }),
  ).toBeVisible();
  await adresseLisible();
});

test("un membre du syndic retire l'accès d'un collègue, qui ne peut plus entrer dans l'espace syndic", async ({
  page,
  browser,
  isMobile,
}) => {
  const [moi, collegue] = [await nouveauSyndic(), await nouveauSyndic()];
  emails.push(moi.email, collegue.email);

  await seConnecter(page, moi.email, MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
  await page.goto("/syndic/membres");
  const ligne = listeDesMembres(page)
    .getByRole("listitem")
    .filter({ hasText: collegue.email });
  await ligne.getByRole("button", { name: "Retirer l'accès" }).click();
  await ligne.getByRole("button", { name: "Confirmer le retrait" }).click();

  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `Accès retiré à ${collegue.email}`,
  );
  await expect(listeDesMembres(page)).not.toContainText(collegue.email);
  await expect(listeDesMembres(page)).toContainText(moi.email);

  const appareilDuCollegue = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const pageDuCollegue = await appareilDuCollegue.newPage();
  await seConnecter(pageDuCollegue, collegue.email, MOT_DE_PASSE);
  await expect(titreAccueil(pageDuCollegue)).toBeVisible();
  await pageDuCollegue.goto("/syndic");
  await expect(pageDuCollegue.getByRole("main")).toContainText(
    "Votre accès à l'espace syndic a été retiré",
  );
  await appareilDuCollegue.close();
});

test("mot de passe oublié, déconnexion et reconnexion", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email, "pas-le-bon-mot-de-passe");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Email ou mot de passe incorrect",
  );

  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  // La connexion a aussi un champ « Adresse email » : attendre la nouvelle page avant de saisir.
  await expect(
    page.getByRole("heading", { level: 1, name: "Mot de passe oublié" }),
  ).toBeVisible();
  await page.getByLabel("Adresse email").fill(syndic.email);
  await page.getByRole("button", { name: "Recevoir un lien" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "un email vient de vous être envoyé",
  );

  await page.goto(await lienRecu(syndic.email));
  await choisirMotDePasse(page, NOUVEAU_MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();

  await page.getByRole("button", { name: "Mon profil" }).click();
  await page
    .getByRole("dialog", { name: "Menu du profil" })
    .getByRole("button", { name: "Se déconnecter" })
    .click();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await page.goto("/syndic");
  await expect(page).toHaveURL(/\/connexion/);

  await seConnecter(page, syndic.email, NOUVEAU_MOT_DE_PASSE);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
});

test("un résident n'entre pas dans l'espace syndic", async ({ page }) => {
  const resident = await nouveauResident();
  emails.push(resident.email);

  await seConnecter(page, resident.email, MOT_DE_PASSE);
  await expect(titreAccueil(page)).toBeVisible();
  await page.goto("/syndic/membres");

  await expect(page.getByRole("main")).toContainText(
    "Cet espace est réservé aux membres du conseil syndical",
  );
  await expect(listeDesMembres(page)).toHaveCount(0);
});
