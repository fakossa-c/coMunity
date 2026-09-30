import { expect, test, type Page } from "@playwright/test";

// Aucune lecture réelle ne se laisse mettre en échec depuis un test sans gêner les autres :
// `/essai-erreur`, ouverte aux seuls tests e2e, lève l'erreur d'une lecture tant que le cookie
// `essai-erreur` est posé.
async function poserLectureEnEchec(page: Page) {
  const { baseURL } = test.info().project.use;
  await page
    .context()
    .addCookies([{ name: "essai-erreur", value: "1", url: baseURL! }]);
}

test("une lecture en échec affiche un écran d'erreur en français, et « Réessayer » relance la lecture", async ({
  page,
}) => {
  await poserLectureEnEchec(page);
  await page.goto("/essai-erreur");

  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 1, name: "Page indisponible" }),
  ).toBeVisible();
  await expect(main).toContainText(
    "Un souci de notre côté. Réessayez dans un instant.",
  );
  await expect(page).toHaveTitle("Page indisponible · coMunity");
  await expect(page.getByText("Application error")).toHaveCount(0);

  // La lecture repasse : « Réessayer » affiche la page, sans quitter l'adresse.
  await page.context().clearCookies({ name: "essai-erreur" });
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(
    main.getByRole("heading", { level: 1, name: "Lecture réussie" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/essai-erreur$/);
});

test("l'écran d'erreur garde « Retour » vers l'Accueil", async ({ page }) => {
  await poserLectureEnEchec(page);
  await page.goto("/essai-erreur");

  // Le lien de l'écran affiché (barre du haut sur mobile, en-tête de page sur ordinateur).
  const retour = page.getByRole("link", { name: /^Retour/ });
  await expect(retour).toHaveCount(1);
  await expect(retour).toHaveAccessibleName("Retour : Accueil");
  await expect(retour).toHaveAttribute("href", "/");
});

test("sans le cookie, la page d'essai se lit normalement", async ({ page }) => {
  const reponse = await page.goto("/essai-erreur");
  expect(reponse?.status()).toBe(200);
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Lecture réussie" }),
  ).toBeVisible();
});
