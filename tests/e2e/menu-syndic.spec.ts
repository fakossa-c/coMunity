import { expect, test, type Page } from "@playwright/test";
import {
  mettreEnRelecture,
  modifierProfil,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  supprimerComptes,
  titreAccueil,
} from "./outils";

// Spec #168, ticket #169 : l'espace syndic a son menu, collé au bord gauche sur ordinateur
// (déplié dès 80 rem, réduit en rail de 64 à 80 rem), dans un tiroir sur mobile ; la page de
// rubriques disparaît et la barre du haut gagne l'onglet « Tableau de bord ».

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

async function syndicConnecte(page: Page) {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await seConnecter(page, syndic.email);
  return syndic;
}

function menuSyndic(page: Page) {
  return page.getByRole("navigation", { name: "Espace syndic" });
}

function boutonDuTiroir(page: Page) {
  return page.getByRole("button", { name: "Menu de l'espace syndic" });
}

function tiroir(page: Page) {
  return page.getByRole("dialog", { name: "Menu de l'espace syndic" });
}

async function largeur(page: Page) {
  return (await menuSyndic(page).boundingBox())!.width;
}

const RUBRIQUES = [
  ["Tableau de bord", "/syndic/tableau-de-bord"],
  ["Résidents", "/syndic/residents"],
  ["Membres du syndic", "/syndic/membres"],
  ["Modération", "/syndic/moderation"],
  ["Annonces", "/syndic/annonces"],
  ["Espaces communs", "/syndic/espaces-communs"],
  ["Règlement intérieur", "/syndic/reglement"],
  ["Mon syndic", "/syndic/mon-syndic"],
] as const;

test.describe("sur ordinateur", () => {
  test.skip(({ isMobile }) => isMobile, "Menu latéral propre à l'ordinateur.");

  test("chaque rubrique s'atteint depuis le menu, qui la marque courante, et les compteurs s'affichent", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const syndic = await syndicConnecte(page);
    const enAttente = await nouveauResident("en_attente");
    emails.push(enAttente.email);
    await mettreEnRelecture(await nouvelleActivite(syndic.id), "À relire");

    await page.goto("/syndic");
    await expect(page).toHaveURL(/\/syndic\/tableau-de-bord$/);
    await expect(
      menuSyndic(page).getByRole("link", {
        name: /^Résidents, \d+ en attente$/,
      }),
    ).toBeVisible();
    await expect(
      menuSyndic(page).getByRole("link", {
        name: /^Modération, \d+ à relire$/,
      }),
    ).toBeVisible();

    for (const [libelle, chemin] of RUBRIQUES) {
      await test.step(libelle, async () => {
        await menuSyndic(page)
          .getByRole("link", { name: new RegExp(`^${libelle}`) })
          .click();
        await expect(page).toHaveURL(new RegExp(`${chemin}$`));
        const courante = menuSyndic(page).locator('[aria-current="page"]');
        await expect(courante).toHaveCount(1);
        await expect(courante).toHaveAccessibleName(new RegExp(`^${libelle}`));
      });
    }

    // Sur un formulaire, c'est la rubrique de sa liste qui est marquée.
    await page.goto("/syndic/annonces/nouvelle");
    await expect(
      menuSyndic(page).locator('[aria-current="page"]'),
    ).toHaveAccessibleName("Annonces");
  });

  test("« Réduire le menu » passe en rail, retenu au rechargement ; « Déplier le menu » le rouvre", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await syndicConnecte(page);
    await page.goto("/syndic/residents");
    expect(await largeur(page)).toBeGreaterThan(250);
    const contenuDeplie = (await page.getByRole("main").boundingBox())!;

    await page.getByRole("button", { name: "Réduire le menu" }).click();
    await expect(
      page.getByRole("button", { name: "Déplier le menu" }),
    ).toBeVisible();
    await expect.poll(() => largeur(page)).toBeLessThan(120);
    // En rail, les pictogrammes gardent leur nom.
    await expect(
      menuSyndic(page).getByRole("link", { name: "Membres du syndic" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Déplier le menu" }),
    ).toBeVisible();
    expect(await largeur(page)).toBeLessThan(120);
    // Le contenu reprend la place laissée par le menu.
    expect((await page.getByRole("main").boundingBox())!.x).toBeLessThan(
      contenuDeplie.x,
    );

    await page.getByRole("button", { name: "Déplier le menu" }).click();
    await expect(
      page.getByRole("button", { name: "Réduire le menu" }),
    ).toBeVisible();
    await expect.poll(() => largeur(page)).toBeGreaterThan(250);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Réduire le menu" }),
    ).toBeVisible();
  });

  test("en 1100 px, le rail est affiché ; « Déplier le menu » l'ouvre par-dessus le contenu, fermé par Échap", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await syndicConnecte(page);
    await page.goto("/syndic/membres");

    const deplier = page.getByRole("button", { name: "Déplier le menu" });
    await expect(deplier).toBeVisible();
    expect(await largeur(page)).toBeLessThan(120);
    const contenu = (await page.getByRole("main").boundingBox())!;

    await deplier.click();
    await expect.poll(() => largeur(page)).toBeGreaterThan(250);
    // Par-dessus : le contenu ne bouge pas.
    expect((await page.getByRole("main").boundingBox())!.x).toBe(contenu.x);

    await page.keyboard.press("Escape");
    await expect(deplier).toBeVisible();
    await expect(deplier).toBeFocused();
    await expect.poll(() => largeur(page)).toBeLessThan(120);

    // Le choix d'une rubrique le referme aussi, et rien n'est retenu.
    await deplier.click();
    await menuSyndic(page).getByRole("link", { name: "Annonces" }).click();
    await expect(page).toHaveURL(/\/syndic\/annonces$/);
    await expect(deplier).toBeVisible();
    await expect.poll(() => largeur(page)).toBeLessThan(120);
  });
});

test.describe("sur mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "Tiroir propre au mobile.");

  test("« Menu de l'espace syndic » ouvre le tiroir, qui retient le focus, se ferme par Échap et rend le focus au bouton", async ({
    page,
  }) => {
    await syndicConnecte(page);
    await page.goto("/syndic/residents");
    await expect(menuSyndic(page)).toBeHidden();

    await boutonDuTiroir(page).click();
    await expect(tiroir(page)).toBeVisible();
    await expect(
      menuSyndic(page).locator('[aria-current="page"]'),
    ).toHaveAccessibleName(/^Résidents/);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(
        await tiroir(page).evaluate((el) =>
          el.contains(document.activeElement),
        ),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(tiroir(page)).toBeHidden();
    await expect(boutonDuTiroir(page)).toBeFocused();

    await boutonDuTiroir(page).click();
    await tiroir(page).getByRole("button", { name: "Fermer le menu" }).click();
    await expect(tiroir(page)).toBeHidden();
    await expect(boutonDuTiroir(page)).toBeFocused();

    await boutonDuTiroir(page).click();
    await menuSyndic(page)
      .getByRole("link", { name: /^Mon syndic/ })
      .click();
    await expect(page).toHaveURL(/\/syndic\/mon-syndic$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Mon syndic" }),
    ).toBeVisible();
  });

  test("un formulaire reste un écran secondaire, sans bouton de menu", async ({
    page,
  }) => {
    await syndicConnecte(page);
    await page.goto("/syndic/annonces/nouvelle");
    await expect(
      page.getByRole("link", { name: "Retour : Annonces" }),
    ).toBeVisible();
    await expect(boutonDuTiroir(page)).toHaveCount(0);
  });
});

function onglet(page: Page, isMobile: boolean) {
  return page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: isMobile ? "Syndic" : "Tableau de bord" });
}

test("un membre actif voit l'onglet de l'espace syndic, actif sur toutes ses pages", async ({
  page,
  isMobile,
}) => {
  await syndicConnecte(page);
  await page.goto("/");
  await expect(onglet(page, isMobile)).toBeVisible();
  await expect(onglet(page, isMobile)).not.toHaveAttribute("aria-current");

  await onglet(page, isMobile).click();
  await expect(page).toHaveURL(/\/syndic\/tableau-de-bord$/);
  await expect(onglet(page, isMobile)).toHaveAttribute("aria-current", "page");

  await page.goto("/syndic/residents");
  await expect(onglet(page, isMobile)).toHaveAttribute("aria-current", "page");
});

test("un résident, un membre retiré et un visiteur ne voient ni l'onglet ni le menu de l'espace syndic", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(titreAccueil(page)).toBeVisible();
  await expect(onglet(page, isMobile)).toHaveCount(0);

  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await expect(titreAccueil(page)).toBeVisible();
  await expect(onglet(page, isMobile)).toHaveCount(0);
  await page.goto("/syndic/residents");
  await expect(page.getByRole("main")).toContainText(
    "Cet espace est réservé aux membres du conseil syndical",
  );
  await expect(menuSyndic(page)).toHaveCount(0);
  await expect(boutonDuTiroir(page)).toHaveCount(0);

  const retire = await nouveauSyndic();
  emails.push(retire.email);
  await modifierProfil(retire.id, { statut: "retire" });
  await page.context().clearCookies();
  await seConnecter(page, retire.email);
  await page.goto("/");
  await expect(onglet(page, isMobile)).toHaveCount(0);
  await page.goto("/syndic/tableau-de-bord");
  await expect(page.getByRole("main")).toContainText(
    "Votre accès à l'espace syndic a été retiré",
  );
  await expect(menuSyndic(page)).toHaveCount(0);
});

test("l'adresse de l'espace syndic mène au tableau de bord, qui n'a pas de « Retour »", async ({
  page,
}) => {
  await syndicConnecte(page);
  await page.goto("/syndic");
  await expect(page).toHaveURL(/\/syndic\/tableau-de-bord$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tableau de bord" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Retour/ })).toHaveCount(0);
});
