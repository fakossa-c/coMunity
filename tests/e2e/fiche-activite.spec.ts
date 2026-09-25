import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
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
  await expect(page).not.toHaveURL(/connexion/);
}

function meta(page: Page, propriete: string) {
  return page.locator(`meta[property="${propriete}"]`).getAttribute("content");
}

test("un visiteur non connecté lit la fiche, sans aucun nom", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const identifiant = await nouvelleActivite(organisateur.id);

  await page.goto(`/activites/${identifiant}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Goûter crêpes" }),
  ).toBeVisible();
  const fiche = page.getByRole("main");
  await expect(fiche).toContainText(
    "Moments partagés · Initiative de résident",
  );
  await expect(fiche).toContainText("de 16h00 à 18h30");
  await expect(fiche).toContainText("Jardin partagé");
  await expect(fiche).toContainText("On fait les crêpes ensemble");
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Danielle");
  await expect(page.locator("body")).not.toContainText("Martin");
  await expect(
    page.getByRole("button", { name: "Je participe" }),
  ).toBeVisible();

  const relayer = page.getByRole("link", {
    name: "Relayer sur le groupe WhatsApp",
  });
  const lienWhatsApp = new URL((await relayer.getAttribute("href"))!);
  expect(lienWhatsApp.origin).toBe("https://wa.me");
  const message = lienWhatsApp.searchParams.get("text")!;
  expect(message).toContain("👋 Goûter crêpes");
  expect(message).toContain("📍 Jardin partagé");
  expect(message).toContain(`/activites/${identifiant}`);

  await page.screenshot({
    path: test.info().outputPath("fiche-visiteur.png"),
    fullPage: true,
  });

  // Retour, Partager et Se connecter tiennent sur le plus petit téléphone courant.
  // Le bord droit du dernier bouton, et non la largeur de page : un téléphone élargit sa zone
  // d'affichage au lieu de défiler.
  await page.setViewportSize({ width: 360, height: 780 });
  const connexion = await page
    .getByRole("link", { name: "Se connecter" })
    .boundingBox();
  expect(connexion!.x + connexion!.width).toBeLessThanOrEqual(360);
});

test("la fiche expose un aperçu riche pour WhatsApp", async ({
  page,
  request,
}) => {
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const identifiant = await nouvelleActivite(organisateur.id);

  await page.goto(`/activites/${identifiant}`);

  expect(await meta(page, "og:title")).toBe("Goûter crêpes");
  expect(await meta(page, "og:description")).toMatch(
    /de 16h00 à 18h30 · Jardin partagé/,
  );
  expect(await meta(page, "og:url")).toContain(`/activites/${identifiant}`);
  const image = await meta(page, "og:image");
  expect(image).toContain(`/activites/${identifiant}/opengraph-image`);

  const reponse = await request.get(new URL(image!).pathname);
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()["content-type"]).toBe("image/png");
  await writeFile(
    test.info().outputPath("apercu-whatsapp.png"),
    await reponse.body(),
  );
});

test("un résident voit qui propose l'activité", async ({ page }) => {
  const organisateur = await nouveauResident("valide");
  const voisin = await nouveauResident("valide");
  emails.push(organisateur.email, voisin.email);
  const identifiant = await nouvelleActivite(organisateur.id);

  await seConnecter(page, voisin.email);
  await page.goto(`/activites/${identifiant}`);

  await expect(page.getByRole("main")).toContainText("Proposé par");
  await expect(page.getByRole("main")).toContainText("Danielle");
});

test("une activité du syndic dit son origine", async ({ page }) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const identifiant = await nouvelleActivite(syndic.id, {
    titre: "Atelier bouturage",
    categorie: "jardin_nature",
    pictogramme: "potted_plant",
  });

  await page.goto(`/activites/${identifiant}`);

  await expect(page.getByRole("main")).toContainText(
    "Jardin & Nature · Proposée par le syndic",
  );
});

test("une adresse d'activité inconnue affiche une page claire", async ({
  page,
}) => {
  const reponse = await page.goto("/activites/inconnue2345");

  expect(reponse?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Activité introuvable" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "n'existe pas ou n'est plus visible",
  );
});

test("depuis l'accueil, une carte mène à la fiche", async ({ page }) => {
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const titre = `Pétanque ${Date.now()}`;
  const identifiant = await nouvelleActivite(organisateur.id, { titre });

  await seConnecter(page, organisateur.email);
  await page.goto("/");
  await page.getByRole("link", { name: titre }).click();

  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: titre }),
  ).toBeVisible();
});

test("après publication, le créateur récupère le lien et le message WhatsApp", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/proposer");
  await page.getByLabel("Titre de l'activité").fill("Atelier compost");
  await page.getByLabel("Catégorie").selectOption({ label: "Jardin & Nature" });
  const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Date").fill(dansUnMois);
  await page.getByLabel("Heure de début").fill("10:00");
  await page.getByLabel("Heure de fin").fill("11:30");
  await page.getByLabel("Lieu").fill("Cour intérieure");
  await page.getByRole("button", { name: "Publier l'activité" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();
  const lien = page.getByLabel("Lien de la fiche");
  await expect(lien).toHaveValue(/\/activites\/[a-z0-9]{12}$/);
  const adresse = await lien.inputValue();
  await expect(page.getByRole("main")).toContainText("🪴 Atelier compost");

  await page.getByRole("button", { name: "Copier le lien" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Lien copié" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    adresse,
  );

  // En haut de page : la barre collante masquerait le titre dans la capture.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("publication-reussie.png"),
    fullPage: true,
  });

  await page.getByRole("link", { name: "Voir la fiche" }).click();
  await expect(page).toHaveURL(adresse);
  await expect(
    page.getByRole("heading", { level: 1, name: "Atelier compost" }),
  ).toBeVisible();
});

test("l'écran de succès est réservé au créateur", async ({ page }) => {
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const identifiant = await nouvelleActivite(organisateur.id);

  await page.goto(`/activites/${identifiant}/publiee`);

  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));
});
