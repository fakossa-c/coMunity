import { randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouvelleActivite,
  nouvelleActiviteAvecPhotos,
  saisirLieuLibre,
  supprimerComptes,
} from "./outils";

// Ticket #10 : jusqu'à 5 photos par activité, compressées dans le navigateur, montrées en galerie
// sur la fiche, en tête de la carte de l'Accueil et dans l'aperçu du lien.

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

function dansUnMois() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Une grande photo de bruit, comme en sort un téléphone : lourde, bien au-delà de la limite de côté. */
async function grandePhoto(largeur = 3000, hauteur = 2000) {
  const pixels = Buffer.from(
    randomBytes(largeur * hauteur * 3).map((o) => 96 + (o % 64)),
  );
  return sharp(pixels, {
    raw: { width: largeur, height: hauteur, channels: 3 },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

function fichierPhoto(nom: string, buffer: Buffer, mimeType = "image/jpeg") {
  return { name: nom, mimeType, buffer };
}

/** Remplit les étapes 1 à 3 (photos à l'étape 1) et s'arrête sur le récapitulatif. */
async function saisirJusquAuRecapitulatif(
  page: Page,
  titre: string,
  photos: ReturnType<typeof fichierPhoto>[],
) {
  await page.goto("/proposer");
  await page.getByLabel("Titre de l'activité").fill(titre);
  if (photos.length > 0) {
    await page
      .getByLabel(/^Ajouter (des|d'autres) photos$/)
      .setInputFiles(photos);
    await expect(page.getByRole("main")).toContainText(
      `${photos.length} ${photos.length === 1 ? "photo" : "photos"} sur 5`,
    );
  }
  await continuer(page, 2);

  await page.getByLabel("Date").fill(dansUnMois());
  await page.getByLabel("Heure de début").fill("10:00");
  await page.getByLabel("Heure de fin").fill("11:30");
  await saisirLieuLibre(page, "Cour intérieure");
  await continuer(page, 3);
  await continuer(page, 4);
}

/** « Continuer », puis attend l'étape `numero`. */
async function continuer(page: Page, numero: number) {
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("main")).toContainText(`Étape ${numero} sur 4`);
}

test("le créateur ajoute des photos compressées, la fiche les montre en galerie", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  const titre = `Goûter photos ${Date.now()}`;

  await saisirJusquAuRecapitulatif(page, titre, [
    fichierPhoto("premiere.jpg", await grandePhoto()),
    fichierPhoto("seconde.jpg", await grandePhoto(2000, 3000)),
  ]);
  await expect(page.getByRole("main")).toContainText("2 photos");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page).toHaveURL(/\/activites\/[a-z0-9]+\/publiee$/);

  await page.goto(page.url().replace(/\/publiee$/, ""));
  const galerie = page.getByRole("region", { name: "Photos de l'activité" });
  await expect(galerie).toContainText("1 sur 2");
  const premiere = galerie.getByRole("img", {
    name: `${titre}, photo 1 sur 2`,
  });
  await expect(premiere).toBeVisible();

  // Compressée avant l'envoi : JPEG, plus grand côté à 1280 px, bien plus légère que l'original.
  const reponse = await page.request.get(
    (await premiere.getAttribute("src")) as string,
  );
  expect(reponse.headers()["content-type"]).toBe("image/jpeg");
  const octets = await reponse.body();
  const meta = await sharp(octets).metadata();
  expect(meta.width).toBe(1280);
  expect(meta.height).toBe(853);
  expect(octets.length).toBeLessThan(1024 * 1024);

  // Le compteur et la photo suivante, au bouton puis au clavier depuis un bouton.
  await galerie.getByRole("button", { name: "Photo suivante" }).click();
  await expect(galerie).toContainText("2 sur 2");
  await expect(
    galerie.getByRole("img", { name: `${titre}, photo 2 sur 2` }),
  ).toBeVisible();
  const portrait = await sharp(
    await (
      await page.request.get(
        (await galerie.getByRole("img").getAttribute("src")) as string,
      )
    ).body(),
  ).metadata();
  expect(portrait.height).toBe(1280);
  expect(portrait.width).toBe(853);
  await galerie.getByRole("button", { name: "Photo précédente" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(galerie).toContainText("1 sur 2");
});

test("le parcours refuse un format inconnu et une sixième photo", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await seConnecter(page, resident.email);
  await page.goto("/proposer");
  const champ = page.getByLabel("Ajouter des photos");

  await champ.setInputFiles([
    {
      name: "animation.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    },
  ]);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choisissez une photo au format JPEG, PNG ou WebP.",
  );

  const petite = await sharp({
    create: { width: 300, height: 200, channels: 3, background: "#c4580a" },
  })
    .jpeg()
    .toBuffer();
  await champ.setInputFiles(
    Array.from({ length: 6 }, (_, i) => fichierPhoto(`photo-${i}.jpg`, petite)),
  );
  await expect(page.getByRole("main")).toContainText("5 photos sur 5");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Vous pouvez ajouter 5 photos de plus : 5 au plus.",
  );
  await expect(page.getByLabel(/^Ajouter/)).toHaveCount(0);
});

test("le créateur met une photo en première puis en retire une, depuis Modifier", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const { identifiant, chemins } = await nouvelleActiviteAvecPhotos(
    resident.id,
    ["#c4580a", "#236b3b", "#0d3b66"],
  );
  await seConnecter(page, resident.email);

  await page.goto(`/activites/${identifiant}/modifier`);
  await expect(page.getByRole("main")).toContainText("3 photos sur 5");
  await page
    .getByRole("button", { name: /^Mettre en première : photo 3 sur 3/ })
    .click();
  await page.getByRole("button", { name: /^Retirer : photo 3 sur 3/ }).click();
  await expect(page.getByRole("main")).toContainText("2 photos sur 5");
  await continuer(page, 2);
  await continuer(page, 3);
  await continuer(page, 4);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));

  const galerie = page.getByRole("region", { name: "Photos de l'activité" });
  await expect(galerie).toContainText("1 sur 2");
  // L'ancienne dernière photo est devenue la première.
  const img = galerie.getByRole("img");
  await expect(img).toHaveAttribute("src", new RegExp(`${chemins[2]}$`));
  const src = (await img.getAttribute("src")) as string;
  // Les photos gardées sont servies, la retirée ne l'est plus.
  expect((await page.request.get(src)).status()).toBe(200);
  expect(
    (await page.request.get(src.replace(chemins[2], chemins[0]))).status(),
  ).toBe(200);
  expect(
    (await page.request.get(src.replace(chemins[2], chemins[1]))).status(),
  ).not.toBe(200);
});

test("supprimer une activité supprime ses photos", async ({ page }) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const { identifiant, chemins } = await nouvelleActiviteAvecPhotos(
    resident.id,
    ["#c4580a", "#236b3b"],
  );
  await seConnecter(page, resident.email);
  await page.goto(`/activites/${identifiant}`);
  const src = (await page
    .getByRole("region", { name: "Photos de l'activité" })
    .getByRole("img")
    .getAttribute("src")) as string;
  expect((await page.request.get(src)).status()).toBe(200);

  await page.getByRole("button", { name: "Supprimer" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(page).toHaveURL(/onglet=j_organise/);

  for (const chemin of chemins) {
    const reponse = await page.request.get(src.replace(chemins[0], chemin));
    expect(reponse.status()).not.toBe(200);
  }
});

test("la première photo remplace le pictogramme sur la carte de l'Accueil et dans l'aperçu du lien", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const titre = `Avec photo ${Date.now()}`;
  const sans = `Sans photo ${Date.now()}`;
  const { identifiant, chemins } = await nouvelleActiviteAvecPhotos(
    resident.id,
    ["#c4580a", "#236b3b"],
    { titre },
  );
  await nouvelleActivite(resident.id, { titre: sans });
  await seConnecter(page, resident.email);

  await page.goto("/");
  const carteAvec = page.locator("article", { hasText: titre });
  await expect(carteAvec.locator("img")).toHaveAttribute(
    "src",
    new RegExp(`${chemins[0]}$`),
  );
  await expect(carteAvec.locator("img")).toHaveCount(1);
  await expect(
    page.locator("article", { hasText: sans }).locator("img"),
  ).toHaveCount(0);

  // L'aperçu du lien : l'image Open Graph existe, à la taille attendue, avec ou sans photo.
  await page.goto(`/activites/${identifiant}`);
  const og = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  const image = await page.request.get(new URL(og as string).pathname);
  expect(image.status()).toBe(200);
  const octets = await image.body();
  const meta = await sharp(octets).metadata();
  expect([meta.width, meta.height]).toEqual([1200, 630]);
  // C'est la première photo (terre cuite unie) qui remplit l'image, pas le fond clair du pictogramme.
  const coin = await sharp(octets)
    .extract({ left: 5, top: 5, width: 1, height: 1 })
    .raw()
    .toBuffer();
  expect(coin[0]).toBeGreaterThan(150);
  expect(coin[1]).toBeLessThan(120);
  expect(coin[2]).toBeLessThan(60);
});

test("la fiche avec photos n'a aucune violation critique d'accessibilité", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const { identifiant } = await nouvelleActiviteAvecPhotos(resident.id, [
    "#c4580a",
    "#236b3b",
  ]);
  await page.goto(`/activites/${identifiant}`);
  await expect(
    page.getByRole("region", { name: "Photos de l'activité" }),
  ).toBeVisible();

  const resultat = await new AxeBuilder({ page }).include("main").analyze();
  const critiques = resultat.violations.filter((v) => v.impact === "critical");
  expect(critiques, JSON.stringify(critiques, null, 2)).toEqual([]);
});
