import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
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
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
}

async function resident() {
  const compte = await nouveauResident("valide");
  emails.push(compte.email);
  return compte;
}

function racine(page: Page) {
  return page.locator("html");
}

test("Mes réglages propose la taille des caractères et l'apparence", async ({
  page,
}) => {
  await seConnecter(page, (await resident()).email);
  await page.goto("/profil/reglages");

  await expect(
    page.getByRole("heading", { level: 1, name: "Mes réglages" }),
  ).toBeVisible();
  const taille = page.getByRole("radiogroup", { name: "Taille des caractères" });
  await expect(taille.getByRole("radio", { name: "Standard" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(
    taille.getByRole("radio", { name: "Grands" }),
  ).toHaveAttribute("aria-checked", "false");

  const apparence = page.getByRole("radiogroup", { name: "Apparence" });
  await expect(
    apparence.getByRole("radio", { name: "Clair" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    apparence.getByRole("radio", { name: "Sombre" }),
  ).toHaveAttribute("aria-checked", "false");
});

test("le choix s'applique tout de suite sur la racine du document", async ({
  page,
}) => {
  await seConnecter(page, (await resident()).email);
  await page.goto("/profil/reglages");

  await expect(racine(page)).not.toHaveAttribute("data-taille");
  await expect(racine(page)).not.toHaveAttribute("data-theme");

  await page.getByRole("radio", { name: "Grands" }).click();
  await expect(racine(page)).toHaveAttribute("data-taille", "grands");

  await page.getByRole("radio", { name: "Sombre" }).click();
  await expect(racine(page)).toHaveAttribute("data-theme", "sombre");

  await page.getByRole("radio", { name: "Standard" }).click();
  await expect(racine(page)).not.toHaveAttribute("data-taille");
});

test("le choix persiste après reconnexion", async ({ page, context }) => {
  const compte = await resident();
  await seConnecter(page, compte.email);
  await page.goto("/profil/reglages");
  // L'enregistrement en base se fait en arrière-plan (action serveur, POST sur la page) :
  // attendu avant de quitter la page, pour ne pas la quitter avant que le serveur ait reçu
  // chaque changement.
  async function choisir(nom: string) {
    const enregistre = page.waitForResponse(
      (reponse) =>
        reponse.url() === page.url() &&
        reponse.request().method() === "POST",
    );
    await page.getByRole("radio", { name: nom }).click();
    await enregistre;
  }

  await choisir("Grands");
  await expect(racine(page)).toHaveAttribute("data-taille", "grands");
  await choisir("Sombre");
  await expect(racine(page)).toHaveAttribute("data-theme", "sombre");

  // Une autre session, sans le state du navigateur précédent : un autre appareil.
  await context.clearCookies();
  await seConnecter(page, compte.email);
  await expect(racine(page)).toHaveAttribute("data-taille", "grands");
  await expect(racine(page)).toHaveAttribute("data-theme", "sombre");
});

test("un visiteur non connecté a l'affichage par défaut", async ({ page }) => {
  await page.goto("/connexion");
  await expect(racine(page)).not.toHaveAttribute("data-taille");
  await expect(racine(page)).not.toHaveAttribute("data-theme");
});

test("les choix segmentés se pilotent au clavier, l'état est annoncé", async ({
  page,
}) => {
  await seConnecter(page, (await resident()).email);
  await page.goto("/profil/reglages");

  const standard = page.getByRole("radio", { name: "Standard" });
  const grands = page.getByRole("radio", { name: "Grands" });
  await standard.focus();
  await expect(standard).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(grands).toBeFocused();
  await expect(grands).toHaveAttribute("aria-checked", "true");
  await expect(racine(page)).toHaveAttribute("data-taille", "grands");

  await page.keyboard.press("ArrowLeft");
  await expect(standard).toBeFocused();
  await expect(standard).toHaveAttribute("aria-checked", "true");
});
