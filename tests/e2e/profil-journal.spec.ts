import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  modifierProfil,
  nouveauResident,
  reglerAffichage,
  supprimerComptes,
  titreAccueil,
  verifierSansDefilementHorizontal,
} from "./outils";

// Profil en présentation Journal (spec #125, ticket #131) : sur ordinateur, très grands titres,
// contenu sur toute la largeur du conteneur et boutons de visibilité compacts ; sur mobile, la
// mise en page actuelle.

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(titreAccueil(page)).toBeVisible();
}

async function residentConnecte(page: Page) {
  const compte = await nouveauResident("valide");
  emails.push(compte.email);
  await modifierProfil(compte.id, {
    pseudo: "Danielle M.",
    telephone: "06 12 34 56 78",
    batiment: "Bât. B",
    etage: 2,
  });
  await seConnecter(page, compte.email);
  return compte;
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

test.describe("sur ordinateur", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Affichage propre à l'ordinateur : le mobile a ses propres tests.",
  );
  test.use({ viewport: { width: 1600, height: 900 } });

  const ECRANS = [
    ["/profil", "Danielle M."],
    ["/profil/informations", "Mes informations"],
    ["/profil/interets", "Mes intérêts"],
    ["/profil/identifiants", "Mes identifiants"],
    ["/profil/reglages", "Mes réglages"],
    ["/profil/informations/modifier", "Modifier mes informations"],
    ["/profil/identifiants/email", "Modifier l'email"],
    ["/profil/identifiants/mot-de-passe", "Modifier le mot de passe"],
  ] as const;

  for (const [chemin, titre] of ECRANS) {
    test(`${chemin} : le titre de la page est un très grand titre`, async ({
      page,
    }) => {
      await residentConnecte(page);
      await page.goto(chemin);

      const h1 = page.getByRole("heading", { level: 1, name: titre });
      await expect(h1).toBeVisible();
      expect(await styleCalcule(h1, "font-size")).toBe("72px");
    });
  }

  test("le Profil range ses rubriques sur deux colonnes, sans colonne étroite", async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto("/profil");

    const rubriques = page
      .getByRole("navigation", { name: "Rubriques du profil" })
      .getByRole("link");
    await expect(rubriques).toHaveCount(4);
    const premiere = await boite(rubriques.nth(0));
    const deuxieme = await boite(rubriques.nth(1));
    const troisieme = await boite(rubriques.nth(2));
    expect(deuxieme.y).toBeCloseTo(premiere.y, 0);
    expect(deuxieme.x).toBeGreaterThan(premiere.x + premiere.width);
    expect(troisieme.y).toBeGreaterThan(premiere.y + premiere.height);
  });

  test("les boutons de visibilité sont compacts (176 px) et disent « Visible » ou « Privé »", async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto("/profil/informations");

    const carte = page.getByRole("list", { name: "Ce que voient vos voisins" });
    for (const nom of ["Téléphone", "Bâtiment", "Étage"]) {
      const bouton = carte.getByRole("button", { name: new RegExp(nom) });
      await expect(bouton.getByText("Privé", { exact: true })).toBeVisible();
      await expect(bouton.getByText("Masqué")).toBeHidden();
      expect((await boite(bouton)).width).toBeCloseTo(176, 0);
    }
    // Le pseudo, verrouillé, a la même largeur : les boutons s'alignent en colonne.
    // (sa pilule est le parent du texte réservé au lecteur d'écran)
    const verrou = carte.getByText("Pseudo : ").locator("..");
    expect((await boite(verrou)).width).toBeCloseTo(176, 0);

    const telephone = carte.getByRole("button", { name: /Téléphone/ });
    await telephone.click();
    // Le texte lu à l'écran (les libellés cachés par la mise en page ne comptent pas).
    await expect(telephone).toHaveText(/Visible/, { useInnerText: true });
    await expect(telephone).not.toHaveText(/Privé/, { useInnerText: true });
    expect((await boite(telephone)).width).toBeCloseTo(176, 0);
  });

  test("Mes informations : la carte de visibilité et le bloc réservé au conseil syndical sont côte à côte, « Modifier » n'occupe pas toute la largeur", async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto("/profil/informations");

    const visibles = await boite(
      page.getByRole("list", { name: "Ce que voient vos voisins" }),
    );
    const reserve = await boite(
      page.getByRole("list", { name: "Prénom et nom" }),
    );
    expect(reserve.x).toBeGreaterThan(visibles.x + visibles.width);
    const modifier = await boite(
      page.getByRole("link", { name: "Modifier mes informations" }),
    );
    expect(modifier.width).toBeLessThan(500);
  });

  test("Mes intérêts : le formulaire d'ajout et la liste sont côte à côte", async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto("/profil/interets");
    await page.getByLabel("Nouveau centre d'intérêt").fill("Jardinage");
    await page.getByRole("button", { name: "Ajouter" }).click();
    const liste = page.getByRole("list", { name: "Vos centres d'intérêt" });
    await expect(liste).toContainText("Jardinage");

    const champ = await boite(page.getByLabel("Nouveau centre d'intérêt"));
    const cartes = await boite(liste);
    expect(cartes.x).toBeGreaterThan(champ.x + champ.width);
  });

  test("Mes identifiants : « Se déconnecter » et « Supprimer mon compte » ne s'étirent pas sur toute la largeur", async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto("/profil/identifiants");

    const deconnexion = await boite(
      page.getByRole("button", { name: "Se déconnecter" }),
    );
    const suppression = await boite(
      page.getByRole("button", { name: "Supprimer mon compte" }),
    );
    expect(deconnexion.width).toBeLessThan(400);
    expect(suppression.width).toBeLessThan(400);
  });

  test("Mes réglages : les choix s'empilent dans une colonne de 720 px au plus", async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto("/profil/reglages");

    const taille = await boite(
      page.getByRole("group", { name: "Taille des caractères" }),
    );
    const apparence = await boite(
      page.getByRole("group", { name: "Apparence" }),
    );
    expect(apparence.y).toBeGreaterThan(taille.y + taille.height);
    expect(apparence.x).toBeCloseTo(taille.x, 0);
    expect(taille.width).toBeLessThanOrEqual(720);
  });
});

test.describe("sur mobile", () => {
  test.skip(
    ({ isMobile }) => !isMobile,
    "Affichage propre au mobile : l'ordinateur a ses propres tests.",
  );

  test("les boutons de visibilité gardent « Masqué » et leur largeur d'aujourd'hui", async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto("/profil/informations");

    const carte = page.getByRole("list", { name: "Ce que voient vos voisins" });
    const bouton = carte.getByRole("button", { name: /Téléphone/ });
    await expect(bouton.getByText("Masqué")).toBeVisible();
    await expect(bouton.getByText("Privé")).toBeHidden();
    expect((await boite(bouton)).width).toBeLessThan(176);
  });
});

const CHEMINS = [
  "/profil",
  "/profil/informations",
  "/profil/interets",
  "/profil/identifiants",
  "/profil/reglages",
  "/profil/informations/modifier",
  "/profil/identifiants/email",
  "/profil/identifiants/mot-de-passe",
] as const;

const REGLAGES = [
  ["clair", { theme: "clair", taille: "standard" }],
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands caractères", { theme: "clair", taille: "grands" }],
] as const;

for (const [reglage, valeurs] of REGLAGES) {
  test(`aucun écran du Profil ne défile horizontalement, en ${reglage}`, async ({
    page,
  }) => {
    const compte = await residentConnecte(page);
    await reglerAffichage(compte.id, valeurs);

    for (const chemin of CHEMINS) {
      await test.step(chemin, async () => {
        await page.goto(chemin);
        await page.getByRole("heading", { level: 1 }).first().waitFor();
        await verifierSansDefilementHorizontal(page);
      });
    }
  });
}
