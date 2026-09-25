import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  lienRecu,
  nouveauResident,
  nouvelEmail,
  supprimerComptes,
} from "./outils";

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string, motDePasse: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function residentConnecte(page: Page) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email, MOT_DE_PASSE);
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  return resident;
}

function carteIdentifiants(page: Page) {
  return page.getByRole("list", { name: "Vos identifiants" });
}

test("Mes identifiants s'ouvre depuis le menu de l'avatar, et on s'y déconnecte", async ({
  page,
}) => {
  const resident = await residentConnecte(page);

  await page.getByRole("button", { name: "Mon profil" }).click();
  await page
    .getByRole("dialog", { name: "Menu du profil" })
    .getByRole("link", { name: /^Profil/ })
    .click();
  await page.getByRole("link", { name: /Mes identifiants/ }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Mes identifiants" }),
  ).toBeVisible();
  await expect(carteIdentifiants(page)).toContainText(resident.email);
  await expect(carteIdentifiants(page)).toContainText("••••••••");
  await expect(
    page.getByRole("link", { name: "Modifier l'e-mail" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Modifier le mot de passe" }),
  ).toBeVisible();

  await page
    .getByRole("main")
    .getByRole("button", { name: "Se déconnecter" })
    .click();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await page.goto("/profil/identifiants");
  await expect(page).toHaveURL(/\/connexion/);
});

test("le changement de mot de passe est refusé, avec le message sous le champ en cause", async ({
  page,
}) => {
  await residentConnecte(page);
  await page.goto("/profil/identifiants/mot-de-passe");
  await expect(page.getByRole("link", { name: "Annuler" })).toBeVisible();

  const actuel = page.getByLabel("Mot de passe actuel", { exact: true });
  const nouveau = page.getByLabel("Nouveau mot de passe", { exact: true });
  const confirmation = page.getByLabel("Confirmer le nouveau mot de passe", {
    exact: true,
  });
  const enregistrer = page.getByRole("button", { name: "Enregistrer" });

  await actuel.fill("pas-le-bon");
  await nouveau.fill("nouveau-secret");
  await confirmation.fill("nouveau-secret");
  await enregistrer.click();
  await expect(actuel).toHaveAccessibleDescription(
    /Mot de passe actuel incorrect/,
  );

  await actuel.fill(MOT_DE_PASSE);
  await nouveau.fill("court");
  await confirmation.fill("court");
  // La vérification du navigateur laisse passer la saisie : le serveur répond seul.
  await nouveau.evaluate((champ) => champ.removeAttribute("minlength"));
  await confirmation.evaluate((champ) => champ.removeAttribute("minlength"));
  await enregistrer.click();
  await expect(nouveau).toHaveAccessibleDescription(/au moins 6 caractères/);

  await actuel.fill(MOT_DE_PASSE);
  await nouveau.fill("nouveau-secret");
  await confirmation.fill("autre-secret");
  await enregistrer.click();
  await expect(confirmation).toHaveAccessibleDescription(
    /ne sont pas identiques/,
  );
});

test("après un changement de mot de passe, on se reconnecte avec le nouveau, pas avec l'ancien", async ({
  page,
}) => {
  const resident = await residentConnecte(page);
  const nouveau = "nouveau-secret-2026";

  await page.goto("/profil/identifiants");
  await page.getByRole("link", { name: "Modifier le mot de passe" }).click();
  await page
    .getByLabel("Mot de passe actuel", { exact: true })
    .fill(MOT_DE_PASSE);
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(nouveau);
  await page
    .getByLabel("Confirmer le nouveau mot de passe", { exact: true })
    .fill(nouveau);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page).toHaveURL(/\/profil\/identifiants/);
  await expect(page.getByRole("status")).toContainText(
    "Votre mot de passe est modifié.",
  );

  await page
    .getByRole("main")
    .getByRole("button", { name: "Se déconnecter" })
    .click();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();

  await seConnecter(page, resident.email, MOT_DE_PASSE);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Email ou mot de passe incorrect",
  );

  await seConnecter(page, resident.email, nouveau);
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
});

test("l'e-mail ne change qu'une fois le lien ouvert, et jamais sans le bon mot de passe", async ({
  page,
}) => {
  const resident = await residentConnecte(page);
  const nouvelle = nouvelEmail("nouvelle");
  emails.push(nouvelle);

  await page.goto("/profil/identifiants");
  await page.getByRole("link", { name: "Modifier l'e-mail" }).click();
  await expect(page.getByLabel("E-mail actuel")).toHaveValue(resident.email);

  const motDePasse = page.getByLabel("Mot de passe", { exact: true });
  await page.getByLabel("Nouvel e-mail").fill(nouvelle);
  await motDePasse.fill("pas-le-bon");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(motDePasse).toHaveAccessibleDescription(
    /Mot de passe incorrect/,
  );

  await motDePasse.fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/profil\/identifiants/);
  await expect(page.getByRole("status")).toContainText(nouvelle);
  // Tant que le lien n'est pas ouvert, l'adresse reste l'ancienne.
  await expect(carteIdentifiants(page)).toContainText(resident.email);

  await page.goto(await lienRecu(nouvelle));
  await expect(page).toHaveURL(/\/profil\/identifiants/);
  await expect(page.getByRole("status")).toContainText(
    "Votre adresse e-mail est modifiée.",
  );
  await expect(carteIdentifiants(page)).toContainText(nouvelle);

  await page
    .getByRole("main")
    .getByRole("button", { name: "Se déconnecter" })
    .click();
  await seConnecter(page, nouvelle, MOT_DE_PASSE);
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
});
