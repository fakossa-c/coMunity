import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  supprimerComptes,
  titreAccueil,
} from "./outils";

// Ticket #115 : une seule règle pour les boutons de retour. En haut d'un écran secondaire, le
// bouton dit « Retour » et rien d'autre (la barre du haut sur mobile, le lien d'en-tête sur
// ordinateur) ; la destination n'est dite qu'aux lecteurs d'écran.

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

type Ecran = { chemin: string; href: string; destination: string };

const ECRANS_DU_RESIDENT: Ecran[] = [
  { chemin: "/profil/informations", href: "/profil", destination: "Profil" },
  {
    chemin: "/profil/informations/modifier",
    href: "/profil/informations",
    destination: "Mes informations",
  },
  { chemin: "/profil/identifiants", href: "/profil", destination: "Profil" },
  {
    chemin: "/profil/identifiants/mot-de-passe",
    href: "/profil/identifiants",
    destination: "Mes identifiants",
  },
  {
    chemin: "/profil/identifiants/email",
    href: "/profil/identifiants",
    destination: "Mes identifiants",
  },
  { chemin: "/profil/interets", href: "/profil", destination: "Profil" },
  { chemin: "/profil/reglages", href: "/profil", destination: "Profil" },
  { chemin: "/mon-syndic", href: "/", destination: "Accueil" },
  { chemin: "/ma-copro", href: "/", destination: "Accueil" },
  { chemin: "/proposer", href: "/activites", destination: "Activités" },
  { chemin: "/page-qui-n-existe-pas", href: "/", destination: "Accueil" },
];

const ECRANS_DU_SYNDIC: Ecran[] = [
  { chemin: "/syndic", href: "/", destination: "Accueil" },
  {
    chemin: "/syndic/residents",
    href: "/syndic",
    destination: "Espace syndic",
  },
  { chemin: "/syndic/membres", href: "/syndic", destination: "Espace syndic" },
  {
    chemin: "/syndic/moderation",
    href: "/syndic",
    destination: "Espace syndic",
  },
  {
    chemin: "/syndic/tableau-de-bord",
    href: "/syndic",
    destination: "Espace syndic",
  },
  {
    chemin: "/syndic/annonces/nouvelle",
    href: "/syndic/annonces",
    destination: "Annonces",
  },
  {
    chemin: "/syndic/espaces-communs/nouveau",
    href: "/syndic/espaces-communs",
    destination: "Espaces communs",
  },
  {
    chemin: "/syndic/mon-syndic/nouvelle",
    href: "/syndic/mon-syndic",
    destination: "Mon syndic",
  },
  {
    chemin: "/syndic/reglement/nouvelle",
    href: "/syndic/reglement",
    destination: "Règlement intérieur",
  },
];

/** Le seul lien « Retour » visible de l'écran, celui de la barre du haut ou de l'en-tête de page. */
async function verifierRetour(page: Page, { href, destination }: Ecran) {
  const retour = page.getByRole("link", { name: /^Retour/ });
  await expect(retour).toHaveCount(1);
  await expect(retour).toHaveAttribute("href", href);
  await expect(retour).toHaveAccessibleName(`Retour : ${destination}`);
  // Aucun autre lien ne fait office de retour sous un autre nom.
  for (const ancien of ["Annuler", "Accueil", "Profil", "Espace syndic"]) {
    await expect(
      page.getByRole("main").getByRole("link", { name: ancien, exact: true }),
    ).toHaveCount(0);
  }
}

test.describe("« Retour » en haut de tout écran secondaire", () => {
  for (const ecran of ECRANS_DU_RESIDENT) {
    test(`un résident lit « Retour » sur ${ecran.chemin}`, async ({ page }) => {
      const resident = await nouveauResident("valide");
      emails.push(resident.email);
      await seConnecter(page, resident.email);

      await page.goto(ecran.chemin);
      await verifierRetour(page, ecran);
    });
  }

  for (const ecran of ECRANS_DU_SYNDIC) {
    test(`le conseil syndical lit « Retour » sur ${ecran.chemin}`, async ({
      page,
    }) => {
      const syndic = await nouveauSyndic();
      emails.push(syndic.email);
      await seConnecter(page, syndic.email);

      await page.goto(ecran.chemin);
      await verifierRetour(page, ecran);
    });
  }

  test("la connexion dit « Retour » elle aussi, vers l'accueil", async ({
    page,
  }) => {
    await page.goto("/connexion");
    await verifierRetour(page, {
      chemin: "/connexion",
      href: "/",
      destination: "Accueil",
    });
  });

  test("« Retour » ramène à la destination dite aux lecteurs d'écran", async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await seConnecter(page, resident.email);
    await expect(titreAccueil(page)).toBeVisible();

    await page.goto("/profil/reglages");
    await page.getByRole("link", { name: "Retour : Profil" }).click();
    await expect(page).toHaveURL(/\/profil$/);
  });
});
