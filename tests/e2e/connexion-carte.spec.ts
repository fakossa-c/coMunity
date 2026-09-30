import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndicSansNom,
  reglerAffichage,
  supprimerComptes,
  verifierSansDefilementHorizontal,
} from "./outils";

// Spec #168, ticket #176 : sur ordinateur, les écrans de connexion tiennent dans une carte centrée
// de 520 à 560 px, sous une barre du haut réduite au logo, même pour une personne connectée ; sous
// celle de la connexion, l'encart « Nouveau dans la résidence ? ». Sur mobile, rien ne change.

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

type Affichage = Parameters<typeof reglerAffichage>[1];

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/\/connexion/);
}

type Ecran = {
  nom: string;
  titre: string;
  /** Vrai pour les écrans où la personne est connectée. */
  connecte: boolean;
  /** Ouvre l'écran, connecté s'il le faut, avec l'affichage demandé. */
  ouvrir: (page: Page, affichage?: Affichage) => Promise<void>;
};

const ECRANS: Ecran[] = [
  {
    nom: "la connexion",
    titre: "Connexion",
    connecte: false,
    ouvrir: async (page) => {
      await page.goto("/connexion");
    },
  },
  {
    nom: "l'inscription",
    titre: "Créer mon compte",
    connecte: false,
    ouvrir: async (page) => {
      await page.goto("/inscription");
    },
  },
  {
    nom: "le mot de passe oublié",
    titre: "Mot de passe oublié",
    connecte: false,
    ouvrir: async (page) => {
      await page.goto("/mot-de-passe-oublie");
    },
  },
  {
    nom: "le nouveau mot de passe",
    titre: "Choisissez votre mot de passe",
    connecte: true,
    ouvrir: async (page, affichage) => {
      const resident = await nouveauResident();
      emails.push(resident.email);
      if (affichage) await reglerAffichage(resident.id, affichage);
      await seConnecter(page, resident.email);
      await page.goto("/nouveau-mot-de-passe");
    },
  },
  {
    nom: "« Présentez-vous à vos voisins »",
    titre: "Présentez-vous à vos voisins",
    connecte: true,
    ouvrir: async (page, affichage) => {
      const syndic = await nouveauSyndicSansNom();
      emails.push(syndic.email);
      if (affichage) await reglerAffichage(syndic.id, affichage);
      await seConnecter(page, syndic.email);
      await expect(page).toHaveURL(/\/completer-profil/);
    },
  },
];

function titre(page: Page, ecran: Ecran) {
  return page.getByRole("heading", { level: 1, name: ecran.titre });
}

/**
 * La boîte de la carte qui porte le titre : son premier ancêtre qui a une ombre, comme toute carte
 * de la présentation Journal. Nulle quand le titre n'est dans aucune carte.
 */
async function boiteCarte(page: Page, ecran: Ecran) {
  return titre(page, ecran).evaluate((element) => {
    for (
      let parent = element.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      if (parent.tagName === "MAIN") return null;
      if (getComputedStyle(parent).boxShadow !== "none") {
        const { x, y, width, height } = parent.getBoundingClientRect();
        return { x, y, width, height };
      }
    }
    return null;
  });
}

/** Sur ordinateur : la barre du haut n'a que le logo, sans onglets, avatar ni « Se connecter ». */
async function verifierLogoSeul(page: Page) {
  const barre = page.locator("header:visible");
  await expect(barre).toHaveCount(1);
  await expect(barre.getByRole("link")).toHaveCount(1);
  await expect(barre.getByRole("link", { name: "coMunity" })).toBeVisible();
  await expect(barre.getByRole("button")).toHaveCount(0);
  await expect(barre.getByRole("navigation")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mon profil" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Navigation principale" }),
  ).toHaveCount(0);
}

/**
 * Sur ordinateur : le titre, les champs et les boutons tiennent dans une carte de 520 à 560 px,
 * centrée dans la fenêtre.
 */
async function verifierCarteCentree(page: Page, ecran: Ecran) {
  await expect(titre(page, ecran)).toBeVisible();
  const carte = await boiteCarte(page, ecran);
  expect(carte, "le titre est dans une carte").not.toBeNull();
  expect(carte!.width).toBeGreaterThanOrEqual(520);
  expect(carte!.width).toBeLessThanOrEqual(560);

  const largeur = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  const gauche = carte!.x;
  const droite = largeur - (carte!.x + carte!.width);
  expect(Math.abs(gauche - droite)).toBeLessThanOrEqual(1);

  const contenu = page
    .getByRole("main")
    .locator("h1, p:visible, input:visible, button:visible");
  expect(await contenu.count()).toBeGreaterThan(1);
  for (const element of await contenu.all()) {
    const boite = (await element.boundingBox())!;
    expect(boite.x).toBeGreaterThanOrEqual(carte!.x - 1);
    expect(boite.x + boite.width).toBeLessThanOrEqual(
      carte!.x + carte!.width + 1,
    );
  }
  await verifierSansDefilementHorizontal(page);
}

for (const largeur of [1440, 1100]) {
  test.describe(`sur ordinateur, en ${largeur} px`, () => {
    test.skip(({ isMobile }) => isMobile, "Carte propre à l'ordinateur.");

    for (const ecran of ECRANS) {
      test(`${ecran.nom} tient dans une carte centrée, sous le logo seul`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: largeur, height: 900 });
        await ecran.ouvrir(page);

        await verifierLogoSeul(page);
        await verifierCarteCentree(page, ecran);
      });
    }
  });
}

test("sur ordinateur, l'encart « Nouveau dans la résidence ? » suit la carte de la connexion, à sa largeur", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Carte propre à l'ordinateur.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await ECRANS[0].ouvrir(page);

  const carte = (await boiteCarte(page, ECRANS[0]))!;
  const encart = (await page
    .getByText("Nouveau dans la résidence ?")
    .locator("..")
    .boundingBox())!;
  expect(encart.y).toBeGreaterThanOrEqual(carte.y + carte.height);
  expect(Math.abs(encart.x - carte.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(encart.width - carte.width)).toBeLessThanOrEqual(1);
  // L'encart est hors de la carte : le lien vers l'inscription y reste.
  await page.getByRole("link", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/inscription/);
});

for (const affichage of [
  { theme: "sombre" },
  { taille: "grands" },
] satisfies Affichage[]) {
  test(`sur ordinateur, en 1100 px et ${affichage.theme ?? "grands caractères"}, les écrans d'une personne connectée tiennent dans leur carte`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Carte propre à l'ordinateur.");
    await page.setViewportSize({ width: 1100, height: 900 });
    for (const ecran of ECRANS.filter((e) => e.connecte)) {
      await page.context().clearCookies();
      await ecran.ouvrir(page, affichage);
      await verifierLogoSeul(page);
      await verifierCarteCentree(page, ecran);
    }
  });
}

test.describe("sur mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "Rendu propre au mobile.");

  for (const ecran of ECRANS) {
    test(`${ecran.nom} garde sa barre de retour et son contenu sans carte`, async ({
      page,
    }) => {
      await ecran.ouvrir(page);

      await expect(titre(page, ecran)).toBeVisible();
      expect(await boiteCarte(page, ecran)).toBeNull();
      const barre = page.locator("header:visible");
      await expect(barre.getByRole("link", { name: /^Retour/ })).toBeVisible();
      // Une personne connectée garde son avatar dans la barre de retour.
      await expect(
        barre.getByRole("button", { name: "Mon profil" }),
      ).toHaveCount(ecran.connecte ? 1 : 0);
      await verifierSansDefilementHorizontal(page);
    });
  }
});
