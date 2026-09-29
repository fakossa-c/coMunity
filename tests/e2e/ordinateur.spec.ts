import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  inscrireResident,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  supprimerComptes,
  titreAccueil,
} from "./outils";

// Cadre « Journal » (spec #125, ticket #126) : sur ordinateur, barre du haut, conteneur de 1280 px,
// menu déroulant et pop-ups remplacent la barre du bas, la colonne étroite et les feuilles du bas.
test.skip(
  ({ isMobile }) => isMobile,
  "Affichage propre à l'ordinateur : le mobile a ses propres tests.",
);

test.use({ viewport: { width: 1600, height: 900 } });

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

async function residentConnecte(page: Page) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await expect(titreAccueil(page)).toBeVisible();
}

function navigationPrincipale(page: Page) {
  return page.getByRole("navigation", { name: "Navigation principale" });
}

async function boite(cible: Locator) {
  return (await cible.boundingBox())!;
}

function styleCalcule(cible: Locator, propriete: string) {
  return cible.evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p),
    propriete,
  );
}

test("la barre du haut porte le logo, les onglets, « Proposer » et l'avatar, sans barre en bas", async ({
  page,
}) => {
  await residentConnecte(page);

  const entete = page.getByRole("banner");
  await expect(entete.getByRole("link", { name: "coMunity" })).toBeVisible();
  const navigation = navigationPrincipale(page);
  await expect(entete.getByRole("navigation")).toHaveCount(1);
  await expect(navigation.getByRole("link")).toHaveCount(3);
  await expect(entete.getByRole("link", { name: "Proposer" })).toBeVisible();
  await expect(
    entete.getByRole("button", { name: "Mon profil" }),
  ).toBeVisible();

  // Légère et sans bordure ; rien n'est collé au bas de la fenêtre.
  expect(await styleCalcule(entete, "border-bottom-width")).toBe("0px");
  expect(await styleCalcule(entete, "position")).not.toBe("fixed");
  const enteteBoite = await boite(entete);
  expect(enteteBoite.y + enteteBoite.height).toBeLessThan(140);
  const navigationBoite = await boite(navigation);
  expect(navigationBoite.y + navigationBoite.height).toBeLessThan(140);
});

test("l'onglet de la page courante est repérable, et chaque onglet mène à sa page", async ({
  page,
}) => {
  await residentConnecte(page);
  await page.goto("/activites");

  const navigation = navigationPrincipale(page);
  const actif = navigation.getByRole("link", { name: "Activités" });
  const autre = navigation.getByRole("link", { name: "Annonces" });
  await expect(actif).toHaveAttribute("aria-current", "page");
  await expect(autre).not.toHaveAttribute("aria-current");
  expect(await styleCalcule(actif, "font-weight")).toBe("800");
  expect(await styleCalcule(autre, "font-weight")).toBe("700");
  // Pilule pêche derrière l'onglet actif, transparente sinon.
  expect(await styleCalcule(actif, "background-color")).toBe(
    "rgb(255, 219, 208)",
  );
  expect(await styleCalcule(autre, "background-color")).toBe(
    "rgba(0, 0, 0, 0)",
  );

  await autre.click();
  await expect(page).toHaveURL(/\/annonces$/);
  await expect(
    navigationPrincipale(page).getByRole("link", { name: "Annonces" }),
  ).toHaveAttribute("aria-current", "page");
});

test("un écran secondaire a la même barre du haut, sans onglet courant", async ({
  page,
}) => {
  await residentConnecte(page);
  await page.goto("/mon-syndic");

  const entete = page.getByRole("banner");
  await expect(navigationPrincipale(page).getByRole("link")).toHaveCount(3);
  await expect(
    navigationPrincipale(page).locator("[aria-current]"),
  ).toHaveCount(0);
  await expect(entete.getByRole("link", { name: "Proposer" })).toBeVisible();
  // « Retour » reste un lien de la page, sous la barre.
  const retour = page.getByRole("main").getByRole("link", { name: "Accueil" });
  await expect(retour).toBeVisible();
  await retour.click();
  await expect(titreAccueil(page)).toBeVisible();
});

test("« Proposer » est dans la barre du haut, sauf sur l'écran Proposer", async ({
  page,
}) => {
  await residentConnecte(page);
  const entete = page.getByRole("banner");

  await page.goto("/activites");
  await entete.getByRole("link", { name: "Proposer" }).click();
  await expect(page).toHaveURL(/\/proposer$/);
  await expect(entete.getByRole("link", { name: "Proposer" })).toHaveCount(0);
  await expect(
    entete.getByRole("button", { name: "Mon profil" }),
  ).toBeVisible();
});

test("le parcours au clavier traverse les onglets de l'en-tête", async ({
  page,
}) => {
  await page.goto("/");

  await navigationPrincipale(page)
    .getByRole("link", { name: "Accueil" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    navigationPrincipale(page).getByRole("link", { name: "Activités" }),
  ).toBeFocused();
});

test("Activités propose « Proposer une activité » sous son titre, sans bouton flottant", async ({
  page,
}) => {
  await residentConnecte(page);
  await page.goto("/activites");

  const proposer = page.getByRole("link", { name: "Proposer une activité" });
  await expect(proposer).toBeVisible();
  expect(await styleCalcule(proposer, "position")).not.toBe("fixed");
  const titre = await boite(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  );
  expect((await boite(proposer)).y).toBeGreaterThanOrEqual(
    titre.y + titre.height,
  );
  // Le flottant du mobile n'est plus là : « Proposer » de la barre du haut et le lien de la page.
  await expect(page.getByRole("link", { name: /^Proposer/ })).toHaveCount(2);

  await proposer.click();
  await expect(page).toHaveURL(/\/proposer$/);
});

test("toutes les pages ont le même conteneur de 1280 px, marges de 64 px, connexion et espace syndic compris", async ({
  page,
}) => {
  const viewport = page.viewportSize()!;
  const largeurConteneur = 1280;

  async function verifier(chemin: string) {
    await page.goto(chemin);
    const contenu = page.getByRole("main");
    await expect(contenu).toBeVisible();
    const cadre = await boite(contenu);
    expect(cadre.width, chemin).toBeCloseTo(largeurConteneur, -1);
    expect(cadre.x + cadre.width / 2, chemin).toBeCloseTo(
      viewport.width / 2,
      -1,
    );
    expect(await styleCalcule(contenu, "padding-left"), chemin).toBe("64px");
    expect(await styleCalcule(contenu, "padding-right"), chemin).toBe("64px");
    // La barre du haut suit le même conteneur : le logo s'aligne sur le contenu.
    const logo = await boite(
      page.getByRole("banner").getByRole("img", { name: "coMunity" }).first(),
    );
    expect(logo.x, chemin).toBeCloseTo(cadre.x + 64, -1);
  }

  // Un visiteur : connexion et Accueil.
  await verifier("/connexion");
  await verifier("/");

  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await expect(titreAccueil(page)).toBeVisible();
  for (const chemin of [
    "/",
    "/activites",
    "/annonces",
    "/proposer",
    "/ma-copro",
    "/profil",
    "/mon-syndic",
  ]) {
    await verifier(chemin);
  }
});

test("les cartes n'ont plus de contour, elles se distinguent par leur ombre douce", async ({
  page,
}) => {
  await residentConnecte(page);
  await page.goto("/profil");

  const rubrique = page
    .getByRole("main")
    .getByRole("link", { name: /^Mes identifiants/ });
  await expect(rubrique).toBeVisible();
  expect(await styleCalcule(rubrique, "border-top-color")).toBe(
    "rgba(0, 0, 0, 0)",
  );
  expect(await styleCalcule(rubrique, "box-shadow")).not.toBe("none");
  // Arrondi de 24 px au moins.
  expect(
    parseFloat(await styleCalcule(rubrique, "border-top-left-radius")),
  ).toBeGreaterThanOrEqual(24);
});

test("le menu de l'avatar est un menu déroulant sous l'avatar, qui s'anime et se ferme au clavier", async ({
  page,
}) => {
  await residentConnecte(page);
  const avatar = page.getByRole("button", { name: "Mon profil" });
  const menu = page.getByRole("dialog", { name: "Menu du profil" });

  await avatar.click();
  await expect(menu).toBeVisible();
  // Il entre en fondu et en glissant, pas par le bas ni par un panneau latéral.
  expect(await menu.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "menu-entre",
  );
  await menu.evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  );
  const boiteAvatar = await boite(avatar);
  const deroulant = await boite(menu);
  expect(deroulant.y).toBeGreaterThanOrEqual(
    boiteAvatar.y + boiteAvatar.height,
  );
  expect(deroulant.x + deroulant.width).toBeCloseTo(
    boiteAvatar.x + boiteAvatar.width,
    -1,
  );
  expect(deroulant.width).toBeLessThan(400);
  expect(deroulant.height).toBeLessThan(page.viewportSize()!.height * 0.6);
  // Pas de bouton « Fermer » : Échap et un clic à côté suffisent.
  await expect(menu.getByRole("button", { name: "Fermer" })).toBeHidden();
  for (const entree of ["Profil", "Mon syndic", "Ma copro"]) {
    await expect(
      menu.getByRole("link", { name: new RegExp(`^${entree}`) }),
    ).toBeVisible();
  }
  await expect(menu.getByRole("link", { name: /Espace syndic/ })).toHaveCount(
    0,
  );

  for (const touche of Array(10).fill("Tab")) {
    await page.keyboard.press(touche);
    expect(
      await menu.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(avatar).toBeFocused();

  await avatar.click();
  await expect(menu).toBeVisible();
  await page.mouse.click(300, 600);
  await expect(menu).toBeHidden();
  await expect(avatar).toBeFocused();
});

test("un membre du conseil syndical trouve « Espace syndic » dans le menu déroulant", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await seConnecter(page, syndic.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Espace syndic" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mon profil" }).click();
  const menu = page.getByRole("dialog", { name: "Menu du profil" });
  await expect(menu.getByRole("link", { name: /Espace syndic/ })).toBeVisible();
});

test("une confirmation s'ouvre en pop-up centrée avec un voile, et le clavier reste utilisable", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const identifiant = await nouvelleActivite(organisateur.id);
  await inscrireResident(identifiant, resident.id);
  await seConnecter(page, resident.email);
  await expect(titreAccueil(page)).toBeVisible();
  await page.goto(`/activites/${identifiant}`);

  const declencheur = page.getByRole("button", {
    name: "Annuler",
    exact: true,
  });
  const popup = page.getByRole("dialog", {
    name: "Annuler votre participation ?",
  });
  await declencheur.click();
  await expect(popup).toBeVisible();
  expect(await popup.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "popup-entre",
  );
  await popup.evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  );

  // Au centre de la fenêtre, pas collée au bas.
  const viewport = page.viewportSize()!;
  const cadre = await boite(popup);
  expect(cadre.x + cadre.width / 2).toBeCloseTo(viewport.width / 2, -1);
  expect(cadre.y + cadre.height / 2).toBeCloseTo(viewport.height / 2, -1);
  expect(cadre.width).toBeLessThan(viewport.width / 2);
  // Voile derrière.
  expect(
    await popup.evaluate(
      (el) => getComputedStyle(el, "::backdrop").backgroundColor,
    ),
  ).not.toBe("rgba(0, 0, 0, 0)");

  // Focus piégé.
  for (const touche of [
    ...Array(6).fill("Tab"),
    ...Array(6).fill("Shift+Tab"),
  ]) {
    await page.keyboard.press(touche);
    expect(
      await popup.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }

  // « Garder » ferme, et le focus revient au bouton qui l'a ouverte.
  await popup.getByRole("button", { name: "Garder ma place" }).click();
  await expect(popup).toBeHidden();
  await expect(declencheur).toBeFocused();

  // Échap ferme aussi.
  await declencheur.click();
  await expect(popup).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(declencheur).toBeFocused();

  // Un clic sur le voile aussi.
  await declencheur.click();
  await expect(popup).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(popup).toBeHidden();
  await expect(declencheur).toBeFocused();
});

test("la réduction des animations coupe toutes les transitions et animations", async ({
  page,
}) => {
  await residentConnecte(page);
  const onglet = navigationPrincipale(page).getByRole("link", {
    name: "Activités",
  });
  const duree = (cible: Locator) => styleCalcule(cible, "transition-duration");

  // Les onglets et le menu s'animent d'ordinaire.
  expect(parseFloat(await duree(onglet))).toBeGreaterThanOrEqual(0.3);
  expect(parseFloat(await duree(onglet))).toBeLessThanOrEqual(0.45);
  expect(await styleCalcule(onglet, "transition-timing-function")).toBe(
    "cubic-bezier(0.2, 0.8, 0.2, 1)",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await duree(onglet)).toBe("0s");
  const avatar = page.getByRole("button", { name: "Mon profil" });
  expect(await duree(avatar)).toBe("0s");
  await avatar.click();
  const menu = page.getByRole("dialog", { name: "Menu du profil" });
  expect(await styleCalcule(menu, "animation-name")).toBe("none");
});

test("un compte refusé n'a ni onglets ni « Proposer une activité », seulement la déconnexion", async ({
  page,
}) => {
  const resident = await nouveauResident("refuse");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Compte non accepté" }),
  ).toBeVisible();
  await expect(navigationPrincipale(page)).toHaveCount(0);

  await page.goto("/activites");
  await expect(page.getByRole("link", { name: /^Proposer/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Mon profil" }).click();
  const menu = page.getByRole("dialog", { name: "Menu du profil" });
  await expect(menu.getByRole("link")).toHaveCount(0);
  await expect(
    menu.getByRole("button", { name: "Se déconnecter" }),
  ).toBeVisible();
});

test("la barre d'action est collée au bas de la colonne", async ({ page }) => {
  await residentConnecte(page);
  await page.goto("/profil/identifiants/email");

  const enregistrer = page.getByRole("button", { name: "Enregistrer" });
  await expect(enregistrer).toBeVisible();
  // La barre est le plus proche ancêtre du bouton dont la position est fixe.
  const barre = await enregistrer.evaluate((el) => {
    let cible: HTMLElement | null = el.parentElement;
    while (cible && getComputedStyle(cible).position !== "fixed") {
      cible = cible.parentElement;
    }
    const { x, y, width, height } = cible!.getBoundingClientRect();
    return { x, y, width, height };
  });
  const viewport = page.viewportSize()!;
  const contenu = await boite(page.getByRole("main"));
  expect(barre.y + barre.height).toBeCloseTo(viewport.height, -1);
  expect(barre.x).toBeCloseTo(contenu.x, -1);
  expect(barre.width).toBeCloseTo(contenu.width, -1);
});

test("l'espace syndic suit le même conteneur de 1280 px, avec les mêmes cartes", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await seConnecter(page, syndic.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Espace syndic" }),
  ).toBeVisible();

  const contenu = await boite(page.getByRole("main"));
  expect(contenu.width).toBeCloseTo(1280, -1);
  // Les rubriques restent des cartes : elles se rangent en colonnes sur la largeur.
  const rubriques = page.getByRole("main").getByRole("list").getByRole("link");
  expect((await boite(rubriques.nth(1))).x).toBeGreaterThan(
    (await boite(rubriques.first())).x,
  );
});
