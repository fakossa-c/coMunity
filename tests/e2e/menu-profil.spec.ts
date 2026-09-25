import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  supprimerComptes,
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

async function residentConnecte(page: Page) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
}

function avatar(page: Page) {
  return page.getByRole("button", { name: "Mon profil" });
}

function menu(page: Page) {
  return page.getByRole("dialog", { name: "Menu du profil" });
}

async function ouvrirMenu(page: Page) {
  await avatar(page).click();
  await expect(menu(page)).toBeVisible();
}

test("l'avatar ouvre le menu du profil depuis un écran principal", async ({
  page,
}) => {
  await residentConnecte(page);

  await expect(avatar(page)).toHaveText("D");
  await ouvrirMenu(page);
  await expect(menu(page)).toContainText("Danielle Martin");
  for (const entree of ["Profil", "Mon syndic", "Ma copro"]) {
    await expect(
      menu(page).getByRole("link", { name: new RegExp(`^${entree}`) }),
    ).toBeVisible();
  }
  await expect(
    menu(page).getByRole("link", { name: /Espace syndic/ }),
  ).toHaveCount(0);
  await expect(
    menu(page).getByRole("button", { name: "Se déconnecter" }),
  ).toBeVisible();

  await menu(page).getByRole("button", { name: "Fermer" }).click();
  await expect(menu(page)).toBeHidden();
  await expect(avatar(page)).toBeFocused();
});

test("le menu se ferme avec Échap et par le voile, et rend le focus à l'avatar", async ({
  page,
}) => {
  await residentConnecte(page);

  await ouvrirMenu(page);
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(avatar(page)).toBeFocused();

  await ouvrirMenu(page);
  await page.mouse.click(10, 10);
  await expect(menu(page)).toBeHidden();
  await expect(avatar(page)).toBeFocused();
});

test("le menu se ferme en faisant glisser la feuille vers le bas", async ({
  page,
}) => {
  await residentConnecte(page);

  await ouvrirMenu(page);
  // La poignée n'est à sa place qu'une fois la feuille montée.
  await menu(page).evaluate((el) =>
    Promise.all(el.getAnimations().map((a) => a.finished)),
  );
  const feuille = (await menu(page).boundingBox())!;
  const x = feuille.x + feuille.width / 2;
  const y = feuille.y + 20;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 60, { steps: 5 });
  await page.mouse.move(x, y + 140, { steps: 5 });
  await page.mouse.up();

  await expect(menu(page)).toBeHidden();
  await expect(avatar(page)).toBeFocused();
});

test("le focus reste dans le menu ouvert", async ({ page }) => {
  await residentConnecte(page);

  await ouvrirMenu(page);
  for (const touche of [
    ...Array(12).fill("Tab"),
    ...Array(12).fill("Shift+Tab"),
  ]) {
    await page.keyboard.press(touche);
    expect(
      await menu(page).evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
});

test("la feuille monte sans animation quand le système réduit les animations", async ({
  page,
}) => {
  await residentConnecte(page);

  await ouvrirMenu(page);
  expect(
    await menu(page).evaluate((el) => getComputedStyle(el).animationName),
  ).not.toBe("none");
  await page.keyboard.press("Escape");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await ouvrirMenu(page);
  expect(
    await menu(page).evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("chaque entrée du menu mène à sa page, depuis un écran secondaire aussi", async ({
  page,
}) => {
  await residentConnecte(page);

  for (const [entree, chemin, titre] of [
    // La page Profil s'ouvre sur l'identité de la personne, comme dans le kit.
    ["Profil", "/profil", "Danielle Martin"],
    ["Mon syndic", "/mon-syndic", "Mon syndic"],
    ["Ma copro", "/ma-copro", "Ma copro"],
  ]) {
    // Après la première entrée, le menu s'ouvre depuis la barre de retour d'une page secondaire.
    await ouvrirMenu(page);
    await menu(page)
      .getByRole("link", { name: new RegExp(`^${entree}`) })
      .click();
    await expect(page).toHaveURL(new RegExp(`${chemin}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: titre }),
    ).toBeVisible();
    await expect(menu(page)).toBeHidden();
  }
});

test("« Se déconnecter » déconnecte et ramène à l'accueil", async ({
  page,
}) => {
  await residentConnecte(page);
  await page.goto("/annonces");

  await ouvrirMenu(page);
  await menu(page).getByRole("button", { name: "Se déconnecter" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Se connecter" }),
  ).toBeVisible();
  await expect(avatar(page)).toHaveCount(0);
});

test("un membre du syndic trouve « Espace syndic » dans le menu", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await seConnecter(page, syndic.email);
  await expect(
    page.getByRole("heading", { level: 1, name: "Espace syndic" }),
  ).toBeVisible();

  await page.goto("/");
  await ouvrirMenu(page);
  await menu(page)
    .getByRole("link", { name: /Espace syndic/ })
    .click();
  await expect(page).toHaveURL(/\/syndic$/);
});
