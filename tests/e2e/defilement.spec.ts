import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouvelleActivite,
  nouveauResident,
  supprimerComptes,
  titreAccueil,
} from "./outils";

// Ticket #112 : aucune barre de défilement horizontale visible, sur aucun écran.

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

const ECRANS = [
  "/",
  "/activites",
  "/annonces",
  "/proposer",
  "/ma-copro",
  "/profil",
];

async function residentConnecte(page: Page) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  // Sans activité à venir, l'Accueil n'affiche pas ses puces de catégories.
  await nouvelleActivite(resident.id);
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(resident.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(titreAccueil(page)).toBeVisible();
}

/** Les éléments qui défilent horizontalement avec une barre visible, et la page si elle déborde. */
function debordements(page: Page) {
  return page.evaluate(() => {
    const racine = document.documentElement;
    const barres = [...document.querySelectorAll<HTMLElement>("*")]
      .filter((el) => {
        const style = getComputedStyle(el);
        const defile = ["auto", "scroll"].includes(style.overflowX);
        return (
          defile &&
          el.scrollWidth > el.clientWidth &&
          style.scrollbarWidth !== "none"
        );
      })
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`);
    return { pageDebordante: racine.scrollWidth > racine.clientWidth, barres };
  });
}

for (const ecran of ECRANS) {
  test(`${ecran} n'affiche aucune barre de défilement horizontale`, async ({
    page,
  }) => {
    await residentConnecte(page);
    await page.goto(ecran);
    await page.waitForLoadState("networkidle");

    expect(await debordements(page)).toEqual({
      pageDebordante: false,
      barres: [],
    });
  });
}

test("sur ordinateur, les puces de catégories passent à la ligne au lieu de défiler", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Le mobile fait défiler la rangée, sans barre visible.");
  await residentConnecte(page);

  const rangee = page
    .getByRole("navigation", { name: "Catégories" })
    .locator("> div");
  const { defile } = await rangee.evaluate((el) => ({
    defile: el.scrollWidth > el.clientWidth,
  }));
  expect(defile).toBe(false);
});
