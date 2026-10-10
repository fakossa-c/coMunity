import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  arriveeDuSyndic,
  modifierProfil,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelEmail,
  reglerAffichage,
  supprimerComptes,
  titreAccueil,
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
}

/** Le syndic, connecté sur son propre appareil, ouvre la page des résidents. */
async function syndicSurLesResidents(
  browser: Browser,
  affichage?: Parameters<typeof reglerAffichage>[1],
) {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  if (affichage) await reglerAffichage(syndic.id, affichage);
  const appareil = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const page = await appareil.newPage();
  await seConnecter(page, syndic.email);
  // Sur mobile, le syndic arrive sur l'accueil : attendre l'arrivée avant d'ouvrir l'espace syndic.
  const mobile = !!test.info().project.use.isMobile;
  await expect(arriveeDuSyndic(page, { mobile })).toBeVisible();
  await page.goto("/syndic/residents");
  await expect(
    page.getByRole("heading", { level: 1, name: "Résidents" }),
  ).toBeVisible();
  return { page, appareil };
}

function ligne(page: Page, liste: string, email: string) {
  return page
    .getByRole("list", { name: liste })
    .getByRole("listitem")
    .filter({ hasText: email });
}

function navigationPrincipale(page: Page) {
  return page.getByRole("navigation", { name: "Navigation principale" });
}

const BANDEAU = "Votre compte attend la validation du conseil syndical";

test("un résident s'inscrit avec son prénom et son nom, puis le syndic le valide", async ({
  page,
  browser,
}) => {
  const email = nouvelEmail("inscription");
  emails.push(email);

  await page.goto("/connexion");
  await page.getByRole("link", { name: "Créer mon compte" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Créer mon compte" }),
  ).toBeVisible();

  await expect(page.getByLabel("Code de la résidence")).toHaveCount(0);
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByLabel("Confirmez le mot de passe").fill("pas-le-meme");
  await page.getByLabel("Prénom").fill("Colette");
  await page.getByLabel("Nom", { exact: true }).fill("Durand");
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Les deux mots de passe ne sont pas identiques",
  );
  await expect(page.getByLabel("Prénom")).toHaveValue("Colette");
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Durand");

  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByLabel("Confirmez le mot de passe").fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(titreAccueil(page)).toBeVisible();
  await expect(page.getByRole("main")).toContainText(BANDEAU);
  await page.screenshot({
    path: test.info().outputPath("resident-en-attente.png"),
    fullPage: true,
  });

  const syndic = await syndicSurLesResidents(browser);
  const enAttente = ligne(syndic.page, "Résidents en attente", email);
  await expect(enAttente).toContainText("Colette Durand");
  await syndic.page.screenshot({
    path: test.info().outputPath("residents-en-attente.png"),
    fullPage: true,
  });
  await enAttente.getByRole("button", { name: "Valider" }).click();
  await expect(syndic.page.getByRole("main").getByRole("status")).toContainText(
    "Compte de Colette Durand validé",
  );
  await expect(ligne(syndic.page, "Résidents validés", email)).toBeVisible();
  await syndic.appareil.close();

  await page.reload();
  await expect(titreAccueil(page)).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText(BANDEAU);
});

test("un résident refusé ne voit qu'un message l'invitant à contacter le syndic", async ({
  page,
  browser,
}) => {
  const resident = await nouveauResident("en_attente");
  emails.push(resident.email);

  const syndic = await syndicSurLesResidents(browser);
  const enAttente = ligne(syndic.page, "Résidents en attente", resident.email);
  await enAttente.getByRole("button", { name: "Refuser" }).click();
  await enAttente.getByRole("button", { name: "Confirmer le refus" }).click();
  await expect(syndic.page.getByRole("main").getByRole("status")).toContainText(
    "Compte de Danielle Martin refusé",
  );
  await syndic.appareil.close();

  await seConnecter(page, resident.email);
  await expect(page.getByRole("main")).toContainText(
    "Le conseil syndical n'a pas validé votre compte",
  );
  await expect(page.getByRole("main")).toContainText(
    "Parlez-en au conseil syndical",
  );
  await expect(navigationPrincipale(page)).toHaveCount(0);
  await page.goto("/proposer");
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(
    "Le conseil syndical n'a pas validé votre compte",
  );
});

test("le syndic retire un résident qui déménage, qui ne voit plus qu'un message d'état", async ({
  page,
  browser,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  const syndic = await syndicSurLesResidents(browser);
  const valide = ligne(syndic.page, "Résidents validés", resident.email);
  await valide.getByRole("button", { name: "Retirer l'accès" }).click();
  await valide.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(syndic.page.getByRole("main").getByRole("status")).toContainText(
    "Accès retiré à Danielle Martin",
  );
  await expect(
    ligne(syndic.page, "Résidents validés", resident.email),
  ).toHaveCount(0);
  await syndic.appareil.close();

  await seConnecter(page, resident.email);
  await expect(page.getByRole("main")).toContainText(
    "Le conseil syndical a retiré votre accès",
  );
  await expect(titreAccueil(page)).toHaveCount(0);
  await expect(navigationPrincipale(page)).toHaveCount(0);
});

test("une adresse longue reste lisible dans la ligne d'un compte en attente, même en grands caractères", async ({
  browser,
}) => {
  const resident = await nouveauResident("en_attente");
  emails.push(resident.email);
  // L'adresse d'origine reste celle du compte, que `supprimerComptes` retrouve.
  const adresse = nouvelEmail("danielle-martin-du-deuxieme-etage");
  await modifierProfil(resident.id, { email: adresse });

  const syndic = await syndicSurLesResidents(browser, { taille: "grands" });
  const enAttente = ligne(syndic.page, "Résidents en attente", adresse);

  // L'adresse tient sur trois lignes au plus : les boutons ne l'écrasent pas, elle ne s'empile
  // pas lettre par lettre (issue #177). Vrai aussi pendant la confirmation du refus.
  async function adresseLisible() {
    const texte = enAttente.getByText(adresse);
    const interligne = await texte.evaluate((element) =>
      parseFloat(getComputedStyle(element).lineHeight),
    );
    const hauteur = (await texte.boundingBox())!.height;
    expect(hauteur).toBeLessThanOrEqual(3 * interligne);
  }
  await adresseLisible();
  await syndic.page.screenshot({
    path: test.info().outputPath("residents-grands-caracteres.png"),
    fullPage: true,
  });
  await enAttente.getByRole("button", { name: "Refuser" }).click();
  await expect(
    enAttente.getByRole("button", { name: "Confirmer le refus" }),
  ).toBeVisible();
  await adresseLisible();
  await syndic.appareil.close();
});

test("l'espace syndic ne propose plus de code de résidence", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);
  await expect(arriveeDuSyndic(page, { mobile: isMobile })).toBeVisible();
  await page.goto("/syndic/residents");
  await expect(
    page.getByRole("heading", { level: 1, name: "Résidents" }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: /Code de la résidence/ }),
  ).toHaveCount(0);
});

function styleCalcule(cible: Locator, propriete: string) {
  return cible.evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p),
    propriete,
  );
}

test("sur l'écran Résidents, chaque rôle a sa couleur : valider en vert, retraits en rouge, avatars sans pêche", async ({
  browser,
  isMobile,
}) => {
  const enAttente = await nouveauResident("en_attente");
  const valide = await nouveauResident("valide");
  emails.push(enAttente.email, valide.email);
  const syndic = await syndicSurLesResidents(browser);
  const page = syndic.page;
  const attente = ligne(page, "Résidents en attente", enAttente.email);
  const valides = ligne(page, "Résidents validés", valide.email);

  // « Valider » confirme : vert pastel, encre verte.
  const valider = attente.getByRole("button", { name: /^Valider/ });
  expect(await styleCalcule(valider, "background-color")).toBe(
    "rgb(169, 244, 182)",
  );
  expect(await styleCalcule(valider, "color")).toBe("rgb(0, 33, 11)");

  // « Refuser » et « Retirer l'accès » sont des gestes destructifs : contour et texte rouges.
  for (const bouton of [
    attente.getByRole("button", { name: /^Refuser/ }),
    valides.getByRole("button", { name: /^Retirer l'accès/ }),
  ]) {
    expect(await styleCalcule(bouton, "color")).toBe("rgb(186, 26, 26)");
    expect(await styleCalcule(bouton, "border-top-color")).toBe(
      "rgb(186, 26, 26)",
    );
  }

  // Le compte en attente se lit par sa forme (cercle pointillé), pas par une couleur.
  await expect(attente).toContainText("Danielle Martin · compte à valider");
  const avatarAttente = attente.getByRole("img", { name: "Compte en attente" });
  expect(await styleCalcule(avatarAttente, "border-top-style")).toBe("dashed");
  expect(await styleCalcule(avatarAttente, "background-color")).toBe(
    "rgba(0, 0, 0, 0)",
  );
  expect((await avatarAttente.boundingBox())!.width).toBe(52);

  // Un résident validé : cercle plein bleu clair avec son initiale.
  const avatarValide = valides.getByText("D", { exact: true });
  expect(await styleCalcule(avatarValide, "background-color")).toBe(
    "rgb(223, 233, 252)",
  );
  expect(await styleCalcule(avatarValide, "color")).toBe("rgb(18, 28, 42)");
  expect((await avatarValide.boundingBox())!.width).toBe(52);

  // La rubrique active du menu est bleu clair, plus pêche (le menu est un tiroir sur mobile).
  if (!isMobile) {
    const rubrique = page.locator('a[aria-current="page"]', {
      hasText: "Résidents",
    });
    expect(await styleCalcule(rubrique, "background-color")).toBe(
      "rgb(223, 233, 252)",
    );
    expect(await styleCalcule(rubrique, "font-weight")).toBe("800");
    expect(await styleCalcule(rubrique, "color")).toBe("rgb(18, 28, 42)");
  }
  await syndic.appareil.close();
});
