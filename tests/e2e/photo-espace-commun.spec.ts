import { randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  MOT_DE_PASSE,
  cheminPhotoEspace,
  nouvelEspaceCommun,
  nouveauResident,
  nouveauSyndic,
  photoEspaceDeposee,
  supprimerComptes,
  supprimerEspacesCommuns,
} from "./outils";

// Ticket #93 : le conseil syndical ajoute, remplace et retire la photo d'un espace commun, un
// résident la voit dans Ma copro.

const emails: string[] = [];
const espaces: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerEspacesCommuns(espaces.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

/** Une grande photo de bruit, comme en sort un téléphone : lourde, bien au-delà de la limite de côté. */
async function grandePhoto(largeur: number, hauteur: number) {
  const pixels = Buffer.from(
    randomBytes(largeur * hauteur * 3).map((o) => 96 + (o % 64)),
  );
  return sharp(pixels, {
    raw: { width: largeur, height: hauteur, channels: 3 },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

async function fichierPhoto(nom: string, largeur: number, hauteur: number) {
  return {
    name: nom,
    mimeType: "image/jpeg",
    buffer: await grandePhoto(largeur, hauteur),
  };
}

/** La carte d'un espace commun dans Ma copro, retrouvée par son nom. */
function carte(page: Page, nom: string) {
  return page
    .getByRole("region", { name: "Espaces communs" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: nom }) });
}

/** La photo de la carte : chargée, à la largeur qu'on attend. */
async function attendrePhoto(photo: Locator, largeur: number) {
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(largeur);
}

async function enregistrer(page: Page, nom: string, fait: string) {
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » ${fait}`,
  );
}

async function ouvrirModification(page: Page, nom: string) {
  await page.goto("/syndic/espaces-communs");
  await page.getByRole("link", { name: `Modifier : ${nom}` }).click();
  await expect(page.getByLabel("Nom")).toHaveValue(nom);
}

test("le conseil syndical ajoute, remplace puis retire la photo d'un espace commun, un résident la voit dans Ma copro", async ({
  page,
  browser,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);

  const {
    baseURL,
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
  } = test.info().project.use;
  const contexte = await browser.newContext({
    baseURL,
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
    locale: "fr-FR",
  });
  const lecteur = await contexte.newPage();
  try {
    await seConnecter(lecteur, resident.email);
    await lecteur.goto("/ma-copro");
    await expect(carte(lecteur, espace.nom)).toBeVisible();
    // Sans photo : la carte n'a pas d'image.
    await expect(carte(lecteur, espace.nom).getByRole("img")).toHaveCount(0);

    // Le conseil syndical ajoute une photo, compressée avant l'envoi.
    await seConnecter(page, syndic.email);
    await ouvrirModification(page, espace.nom);
    await expect(page.getByRole("main")).toContainText(
      "Aucune photo pour l'instant.",
    );
    await page
      .getByLabel("Ajouter une photo")
      .setInputFiles(await fichierPhoto("salle.jpg", 3000, 2000));
    await expect(page.getByRole("main")).toContainText("Une photo");
    await expect(
      page.getByRole("img", {
        name: `${espace.nom}, photo de l'espace commun`,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("formulaire-espace-photo.png"),
      fullPage: true,
    });
    await enregistrer(page, espace.nom, "est enregistré.");

    const premiere = await cheminPhotoEspace(espace.id);
    expect(premiere).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(await photoEspaceDeposee(premiere!)).toBe(true);

    // Le résident la voit dans Ma copro : JPEG, plus grand côté à 1280 px, légère.
    await lecteur.reload();
    const photo = carte(lecteur, espace.nom).getByRole("img", {
      name: `${espace.nom}, photo de l'espace commun`,
    });
    await attendrePhoto(photo, 1280);
    const octets = await (
      await lecteur.request.get((await photo.getAttribute("src")) as string)
    ).body();
    expect((await sharp(octets).metadata()).height).toBe(853);
    expect(octets.length).toBeLessThan(1024 * 1024);
    await lecteur.screenshot({
      path: test.info().outputPath("ma-copro-photo.png"),
      fullPage: true,
    });
    const resultat = await new AxeBuilder({ page: lecteur })
      .include("main")
      .analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);

    // La modification rouvre le formulaire avec la photo enregistrée ; la remplacer supprime l'ancienne.
    await ouvrirModification(page, espace.nom);
    await expect(
      page.getByRole("img", {
        name: `${espace.nom}, photo de l'espace commun`,
      }),
    ).toBeVisible();
    await page
      .getByLabel("Remplacer la photo")
      .setInputFiles(await fichierPhoto("autre.jpg", 2000, 3000));
    await expect(page.getByRole("main")).toContainText("Une photo");
    await enregistrer(page, espace.nom, "est enregistré.");

    const seconde = await cheminPhotoEspace(espace.id);
    expect(seconde).not.toBe(premiere);
    expect(await photoEspaceDeposee(seconde!)).toBe(true);
    expect(await photoEspaceDeposee(premiere!)).toBe(false);
    await lecteur.reload();
    const portrait = carte(lecteur, espace.nom).getByRole("img");
    await attendrePhoto(portrait, 853);

    // Retirer la photo : la carte redevient sans image, le fichier est supprimé.
    await ouvrirModification(page, espace.nom);
    await page.getByRole("button", { name: "Retirer la photo" }).click();
    await expect(page.getByRole("main")).toContainText(
      "Aucune photo pour l'instant.",
    );
    await enregistrer(page, espace.nom, "est enregistré.");

    expect(await cheminPhotoEspace(espace.id)).toBeNull();
    expect(await photoEspaceDeposee(seconde!)).toBe(false);
    await lecteur.reload();
    await expect(carte(lecteur, espace.nom)).toBeVisible();
    await expect(carte(lecteur, espace.nom).getByRole("img")).toHaveCount(0);
  } finally {
    await contexte.close();
  }
});

test("un nouvel espace commun se crée avec sa photo, et la supprimer avec l'espace retire le fichier", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const nom = `Terrasse ${Date.now()}`;
  espaces.push(nom);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs/nouveau");
  await page.getByLabel("Nom").fill(nom);
  await page
    .getByLabel("Ajouter une photo")
    .setInputFiles(await fichierPhoto("terrasse.jpg", 1600, 1200));
  await expect(page.getByRole("main")).toContainText("Une photo");
  await enregistrer(page, nom, "est ajouté aux espaces communs.");

  await page.getByRole("link", { name: `Modifier : ${nom}` }).click();
  await expect(page.getByLabel("Nom")).toHaveValue(nom);
  const url = page.url();
  const id = url.slice(url.lastIndexOf("/") + 1);
  const chemin = await cheminPhotoEspace(id);
  expect(chemin).not.toBeNull();
  expect(await photoEspaceDeposee(chemin!)).toBe(true);

  await page.getByRole("button", { name: "Supprimer l'espace commun" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est supprimé`,
  );
  expect(await photoEspaceDeposee(chemin!)).toBe(false);
});

test("le formulaire refuse un fichier qui n'est pas une photo", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs/nouveau");

  await page.getByLabel("Ajouter une photo").setInputFiles({
    name: "animation.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choisissez une photo au format JPEG, PNG ou WebP.",
  );
  await expect(page.getByRole("main")).toContainText(
    "Aucune photo pour l'instant.",
  );
});
