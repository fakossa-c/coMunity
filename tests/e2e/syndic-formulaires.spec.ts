import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauSyndic,
  nouvelEspaceCommun,
  nouvelleAnnonce,
  nouvelleFicheSyndic,
  nouvelleSectionReglement,
  supprimerAnnonces,
  supprimerComptes,
  supprimerEspacesCommuns,
  supprimerFichesSyndic,
  supprimerSectionsReglement,
} from "./outils";

// Spec #168, ticket #174 : sur ordinateur, les formulaires de l'espace syndic tiennent dans une
// colonne de 720 px au plus, leurs champs groupés en cartes, et leur barre « Enregistrer » ou
// « Publier » reste fixée en bas de l'écran, alignée sur la colonne. Sur mobile, rien ne change.

const COLONNE = 720;

const emails: string[] = [];
const annonces: string[] = [];
const espaces: string[] = [];
const sections: string[] = [];
const fiches: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerAnnonces(annonces.splice(0));
  await supprimerEspacesCommuns(espaces.splice(0));
  await supprimerSectionsReglement(sections.splice(0));
  await supprimerFichesSyndic(fiches.splice(0));
});

async function syndicConnecte(page: Page) {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(syndic.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

type Formulaire = {
  nom: string;
  /** L'adresse du formulaire, avec les données qu'il modifie, créées pour le test. */
  adresse: () => Promise<string>;
  action: "Publier" | "Enregistrer";
  /** Ce qui ouvre toute la hauteur du formulaire avant de le mesurer. */
  deplier?: (page: Page) => Promise<void>;
};

const FORMULAIRES: Formulaire[] = [
  {
    nom: "une nouvelle annonce avec sondage",
    adresse: async () => "/syndic/annonces/nouvelle",
    action: "Publier",
    deplier: (page) =>
      expect(async () => {
        await page.getByLabel("Type").selectOption("sondage");
        await expect(page.getByLabel("Question", { exact: true })).toBeVisible({
          timeout: 1000,
        });
      }).toPass(),
  },
  {
    nom: "une annonce modifiée",
    adresse: async () => {
      const annonce = await nouvelleAnnonce();
      annonces.push(annonce.titre);
      return `/syndic/annonces/${annonce.id}`;
    },
    action: "Enregistrer",
  },
  {
    nom: "un nouvel espace commun",
    adresse: async () => "/syndic/espaces-communs/nouveau",
    action: "Enregistrer",
  },
  {
    nom: "un espace commun modifié",
    adresse: async () => {
      const espace = await nouvelEspaceCommun();
      espaces.push(espace.nom);
      return `/syndic/espaces-communs/${espace.id}`;
    },
    action: "Enregistrer",
  },
  {
    nom: "une nouvelle section du règlement",
    adresse: async () => "/syndic/reglement/nouvelle",
    action: "Enregistrer",
  },
  {
    nom: "une section du règlement modifiée",
    adresse: async () => {
      const section = await nouvelleSectionReglement();
      sections.push(section.titre);
      return `/syndic/reglement/${section.id}`;
    },
    action: "Enregistrer",
    deplier: (page) =>
      expect(async () => {
        // Une fois ouvert, le bouton devient « Masquer l'aperçu » : pas de second clic.
        const voir = page.getByRole("button", { name: "Voir l'aperçu" });
        if (await voir.isVisible()) await voir.click();
        await expect(
          page.getByRole("region", { name: "Aperçu de la section" }),
        ).toBeVisible({ timeout: 1000 });
      }).toPass(),
  },
  {
    nom: "une nouvelle fiche de Mon syndic",
    adresse: async () => "/syndic/mon-syndic/nouvelle",
    action: "Enregistrer",
  },
  {
    nom: "une fiche de Mon syndic modifiée",
    adresse: async () => {
      const fiche = await nouvelleFicheSyndic();
      fiches.push(fiche.prenom);
      return `/syndic/mon-syndic/${fiche.id}`;
    },
    action: "Enregistrer",
  },
];

async function ouvrir(page: Page, formulaire: Formulaire) {
  await page.goto(await formulaire.adresse());
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await formulaire.deplier?.(page);
}

function boutonAction(page: Page, formulaire: Formulaire) {
  return page.getByRole("button", { name: formulaire.action, exact: true });
}

/** Le bouton d'action est au bas de la fenêtre, quel que soit le défilement. */
async function attendreAuBasDeLaFenetre(page: Page, formulaire: Formulaire) {
  const hauteur = page.viewportSize()!.height;
  const bouton = (await boutonAction(page, formulaire).boundingBox())!;
  expect(bouton.y + bouton.height).toBeGreaterThan(hauteur - 90);
  expect(bouton.y + bouton.height).toBeLessThanOrEqual(hauteur);
}

for (const largeur of [1440, 1100]) {
  test.describe(`sur ordinateur, en ${largeur} px`, () => {
    test.skip(({ isMobile }) => isMobile, "Colonne propre à l'ordinateur.");

    for (const formulaire of FORMULAIRES) {
      test(`${formulaire.nom} tient dans une colonne de 720 px, sa barre d'action fixée en bas et alignée sur elle`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: largeur, height: 800 });
        await syndicConnecte(page);
        await ouvrir(page, formulaire);

        const titre = (await page
          .getByRole("heading", { level: 1 })
          .boundingBox())!;
        const gauche = titre.x;
        const droite = gauche + COLONNE;
        expect(titre.x + titre.width).toBeLessThanOrEqual(droite + 1);

        // Chaque champ reste dans la colonne.
        const champs = page
          .getByRole("main")
          .locator("input:visible, textarea:visible, select:visible");
        expect(await champs.count()).toBeGreaterThan(0);
        for (const champ of await champs.all()) {
          const boite = (await champ.boundingBox())!;
          expect(boite.x).toBeGreaterThanOrEqual(gauche - 1);
          expect(boite.x + boite.width).toBeLessThanOrEqual(droite + 1);
        }

        // La barre suit la colonne : son bouton en occupe la largeur, sans en sortir.
        const bouton = (await boutonAction(page, formulaire).boundingBox())!;
        expect(bouton.x).toBeGreaterThanOrEqual(gauche - 1);
        expect(bouton.x + bouton.width).toBeLessThanOrEqual(droite + 1);
        expect(bouton.width).toBeGreaterThan(COLONNE - 120);

        // Fixée : au bas de la fenêtre en haut de page comme tout en bas.
        await attendreAuBasDeLaFenetre(page, formulaire);
        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        );
        await attendreAuBasDeLaFenetre(page, formulaire);

        // Rien ne passe sous la barre : le dernier champ reste au-dessus d'elle.
        const dernier = (await champs.last().boundingBox())!;
        const barre = (await boutonAction(page, formulaire).boundingBox())!;
        expect(dernier.y + dernier.height).toBeLessThan(barre.y);
      });
    }
  });
}

test.describe("sur mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "Rendu propre au mobile.");

  for (const formulaire of FORMULAIRES) {
    test(`${formulaire.nom} garde sa barre d'action sur toute la largeur de l'écran`, async ({
      page,
    }) => {
      await syndicConnecte(page);
      await ouvrir(page, formulaire);

      const { width } = page.viewportSize()!;
      const bouton = (await boutonAction(page, formulaire).boundingBox())!;
      expect(bouton.width).toBeGreaterThan(width - 48);
      await attendreAuBasDeLaFenetre(page, formulaire);

      const champ = (await page
        .getByRole("main")
        .locator("input:visible, textarea:visible, select:visible")
        .first()
        .boundingBox())!;
      expect(champ.width).toBeGreaterThan(width - 48);
    });
  }
});
