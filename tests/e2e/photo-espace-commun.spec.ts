import { randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  MOT_DE_PASSE,
  deposerImageEspace,
  mediasEspace,
  nouvelEspaceCommun,
  nouveauResident,
  nouveauSyndic,
  photoEspaceDeposee,
  reglerAffichage,
  supprimerComptes,
  supprimerEspacesCommuns,
  verifierSansDefilementHorizontal,
} from "./outils";

// Tickets #93 et #135 : le conseil syndical ajoute, réordonne et retire les photos d'un espace
// commun, envoie, remplace et retire son plan de situation ; un résident les voit dans Ma copro
// (la carte, puis la galerie et le plan de la fiche).

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
    .getByRole("region", { name: "Espaces et biens communs" })
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

/** La galerie de la fiche d'un espace commun. */
function galerie(page: Page) {
  return page.getByRole("region", { name: "Photos de l'espace commun" });
}

test("le conseil syndical ajoute, réordonne, remplace puis retire les photos d'un espace commun, un résident les voit dans Ma copro", async ({
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

    // Le conseil syndical ajoute trois photos d'un coup, compressées avant l'envoi.
    await seConnecter(page, syndic.email);
    await ouvrirModification(page, espace.nom);
    await expect(page.getByRole("main")).toContainText(
      "Aucune photo pour l'instant.",
    );
    await page
      .getByLabel("Ajouter des photos")
      .setInputFiles([
        await fichierPhoto("large.jpg", 3000, 2000),
        await fichierPhoto("haute.jpg", 2000, 3000),
        await fichierPhoto("carree.jpg", 1600, 1600),
      ]);
    await expect(page.getByRole("main")).toContainText("3 photos sur 5");
    await expect(
      page.getByRole("img", { name: `${espace.nom}, photo 3 sur 3` }),
    ).toBeVisible();
    // Les boutons de la première et de la dernière photo n'ont pas de sens : ils n'existent pas.
    await expect(
      page.getByRole("button", { name: "Monter : photo 1 sur 3" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Descendre : photo 3 sur 3" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath("formulaire-espace-photos.png"),
      fullPage: true,
    });

    // La photo carrée passe en deuxième position, la haute reste dernière.
    await page.getByRole("button", { name: "Monter : photo 3 sur 3" }).click();
    await expect(
      page.getByText("Photo déplacée en position 2 sur 3."),
    ).toBeVisible();
    await enregistrer(page, espace.nom, "est enregistré.");

    const trois = await mediasEspace(espace.id);
    expect(trois.photos).toHaveLength(3);
    for (const chemin of trois.photos) {
      expect(chemin).toMatch(/^[0-9a-f-]{36}\.jpg$/);
      expect(await photoEspaceDeposee(chemin)).toBe(true);
    }

    // Le résident voit la première sur la carte : JPEG, plus grand côté à 1280 px, légère.
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
      path: test.info().outputPath("ma-copro-photos.png"),
      fullPage: true,
    });

    // Sur la fiche : la galerie montre les photos dans l'ordre choisi (large, carrée, haute).
    await lecteur.goto(`/ma-copro/espaces/${espace.id}`);
    await expect(galerie(lecteur)).toContainText("1 sur 3");
    await attendrePhoto(
      galerie(lecteur).getByRole("img", {
        name: `${espace.nom}, photo 1 sur 3`,
      }),
      1280,
    );
    await lecteur.getByRole("button", { name: "Photo suivante" }).click();
    await attendrePhoto(
      galerie(lecteur).getByRole("img", {
        name: `${espace.nom}, photo 2 sur 3`,
      }),
      1280,
    );
    await lecteur.getByRole("button", { name: "Photo suivante" }).click();
    await attendrePhoto(
      galerie(lecteur).getByRole("img", {
        name: `${espace.nom}, photo 3 sur 3`,
      }),
      853,
    );
    const resultat = await new AxeBuilder({ page: lecteur })
      .include("main")
      .analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);

    // La modification rouvre le formulaire avec les trois photos ; en retirer une supprime son fichier.
    await ouvrirModification(page, espace.nom);
    await expect(page.getByRole("main")).toContainText("3 photos sur 5");
    await page.getByRole("button", { name: "Retirer : photo 2 sur 3" }).click();
    await expect(page.getByRole("main")).toContainText("2 photos sur 5");
    await enregistrer(page, espace.nom, "est enregistré.");

    const deux = await mediasEspace(espace.id);
    expect(deux.photos).toEqual([trois.photos[0], trois.photos[2]]);
    expect(await photoEspaceDeposee(trois.photos[1])).toBe(false);
    expect(await photoEspaceDeposee(trois.photos[0])).toBe(true);

    // Remonter la haute en première change l'image de la carte, et rien n'est perdu.
    await ouvrirModification(page, espace.nom);
    await page.getByRole("button", { name: "Monter : photo 2 sur 2" }).click();
    await enregistrer(page, espace.nom, "est enregistré.");
    expect((await mediasEspace(espace.id)).photos).toEqual([
      trois.photos[2],
      trois.photos[0],
    ]);
    await lecteur.goto("/ma-copro");
    await attendrePhoto(carte(lecteur, espace.nom).getByRole("img"), 853);

    // Tout retirer : la carte redevient sans image, les fichiers sont supprimés.
    await ouvrirModification(page, espace.nom);
    await page.getByRole("button", { name: "Retirer : photo 1 sur 2" }).click();
    await page.getByRole("button", { name: "Retirer : photo 1 sur 1" }).click();
    await expect(page.getByRole("main")).toContainText(
      "Aucune photo pour l'instant.",
    );
    await enregistrer(page, espace.nom, "est enregistré.");

    expect((await mediasEspace(espace.id)).photos).toEqual([]);
    for (const chemin of trois.photos)
      expect(await photoEspaceDeposee(chemin)).toBe(false);
    await lecteur.reload();
    await expect(carte(lecteur, espace.nom)).toBeVisible();
    await expect(carte(lecteur, espace.nom).getByRole("img")).toHaveCount(0);
  } finally {
    await contexte.close();
  }
});

test("le conseil syndical envoie, remplace puis retire le plan de situation, un résident le voit sur la fiche", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);
  const nomPlan = `Plan de situation de ${espace.nom}`;

  await seConnecter(page, syndic.email);
  await ouvrirModification(page, espace.nom);
  await expect(page.getByRole("main")).toContainText(
    "Aucun plan pour l'instant.",
  );
  await page
    .getByLabel("Ajouter un plan")
    .setInputFiles(await fichierPhoto("plan.jpg", 2400, 1600));
  await expect(page.getByRole("main")).toContainText("Un plan");
  await expect(page.getByRole("img", { name: nomPlan })).toBeVisible();
  await enregistrer(page, espace.nom, "est enregistré.");

  const premier = (await mediasEspace(espace.id)).plan_chemin;
  expect(premier).toMatch(/^[0-9a-f-]{36}\.jpg$/);
  expect(await photoEspaceDeposee(premier!)).toBe(true);

  // Sur la fiche, le plan est dans « Utiliser cet espace », avec un lien pour l'agrandir.
  await page.goto(`/ma-copro/espaces/${espace.id}`);
  const plan = page.getByRole("img", { name: nomPlan });
  await attendrePhoto(plan, 1280);
  const lien = page.getByRole("link", { name: /Agrandir le plan/ });
  await expect(lien).toHaveAttribute("target", "_blank");
  await expect(lien).toHaveAttribute(
    "href",
    (await plan.getAttribute("src")) as string,
  );
  await expect(page.getByRole("complementary")).toContainText(
    "Plan de situation",
  );

  // Remplacer le plan supprime l'ancien fichier.
  await ouvrirModification(page, espace.nom);
  await page
    .getByLabel("Remplacer le plan")
    .setInputFiles(await fichierPhoto("autre-plan.jpg", 1000, 2000));
  // Le nouveau plan est prêt quand son aperçu est celui du fichier choisi, plus celui du plan enregistré.
  await expect(page.getByRole("img", { name: nomPlan })).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await enregistrer(page, espace.nom, "est enregistré.");
  const second = (await mediasEspace(espace.id)).plan_chemin;
  expect(second).not.toBe(premier);
  expect(await photoEspaceDeposee(second!)).toBe(true);
  expect(await photoEspaceDeposee(premier!)).toBe(false);

  // Retirer le plan : la fiche n'en a plus, le fichier est supprimé.
  await ouvrirModification(page, espace.nom);
  await page.getByRole("button", { name: "Retirer le plan" }).click();
  await expect(page.getByRole("main")).toContainText(
    "Aucun plan pour l'instant.",
  );
  await enregistrer(page, espace.nom, "est enregistré.");
  expect((await mediasEspace(espace.id)).plan_chemin).toBeNull();
  expect(await photoEspaceDeposee(second!)).toBe(false);
  await page.goto(`/ma-copro/espaces/${espace.id}`);
  await expect(page.getByRole("img", { name: nomPlan })).toHaveCount(0);
  await expect(page.getByText("Agrandir le plan")).toHaveCount(0);
});

test("un nouvel espace commun se crée avec ses photos et son plan, et le supprimer avec l'espace retire les fichiers", async ({
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
    .getByLabel("Ajouter des photos")
    .setInputFiles([
      await fichierPhoto("terrasse.jpg", 1600, 1200),
      await fichierPhoto("vue.jpg", 1200, 1600),
    ]);
  await expect(page.getByRole("main")).toContainText("2 photos sur 5");
  await page
    .getByLabel("Ajouter un plan")
    .setInputFiles(await fichierPhoto("plan.jpg", 1200, 800));
  await expect(page.getByRole("main")).toContainText("Un plan");
  await enregistrer(page, nom, "est ajouté aux espaces communs.");

  await page.getByRole("link", { name: `Modifier : ${nom}` }).click();
  await expect(page.getByLabel("Nom")).toHaveValue(nom);
  const url = page.url();
  const id = url.slice(url.lastIndexOf("/") + 1);
  const { photos, plan_chemin: plan } = await mediasEspace(id);
  expect(photos).toHaveLength(2);
  expect(plan).not.toBeNull();
  for (const chemin of [...photos, plan!])
    expect(await photoEspaceDeposee(chemin)).toBe(true);
  // Le formulaire rouvre les deux photos et le plan.
  await expect(page.getByRole("main")).toContainText("2 photos sur 5");
  await expect(page.getByRole("main")).toContainText("Un plan");

  await page.getByRole("button", { name: "Supprimer l'espace commun" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est supprimé`,
  );
  for (const chemin of [...photos, plan!])
    expect(await photoEspaceDeposee(chemin)).toBe(false);
});

test("le formulaire refuse un fichier qui n'est pas une image, et plus de 5 photos", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs/nouveau");

  await page.getByLabel("Ajouter des photos").setInputFiles({
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

  await page.getByLabel("Ajouter un plan").setInputFiles({
    name: "plan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(page.getByRole("main")).toContainText(
    "Aucun plan pour l'instant.",
  );

  const six = await Promise.all(
    ["a", "b", "c", "d", "e", "f"].map((n) =>
      fichierPhoto(`${n}.jpg`, 320, 240),
    ),
  );
  await page.getByLabel("Ajouter des photos").setInputFiles(six);
  await expect(page.getByRole("main")).toContainText("5 photos sur 5");
  await expect(
    page.getByText("Vous pouvez ajouter 5 photos de plus : 5 au plus."),
  ).toBeVisible();
  // Plus de place : le sélecteur disparaît.
  await expect(page.getByLabel("Ajouter d'autres photos")).toHaveCount(0);
});

test("la galerie de la fiche : vignettes sur ordinateur seulement, une photo seule sans commandes", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun({
    photos: [
      await deposerImageEspace("#8f2b00", 1280, 720),
      await deposerImageEspace("#0d3b66", 1280, 720),
      await deposerImageEspace("#00210b", 1280, 720),
    ],
  });
  espaces.push(espace.nom);
  const seule = await nouvelEspaceCommun({
    photos: [await deposerImageEspace("#8f2b00")],
  });
  espaces.push(seule.nom);
  const bureau = test.info().project.name === "desktop";

  await seConnecter(page, resident.email);
  await page.goto(`/ma-copro/espaces/${espace.id}`);
  await expect(galerie(page)).toContainText("1 sur 3");

  const vignettes = galerie(page).getByRole("list", { name: "Vignettes" });
  if (bureau) {
    await expect(vignettes.getByRole("button")).toHaveCount(3);
    await expect(
      vignettes.getByRole("button", { name: "Photo 1 sur 3" }),
    ).toHaveAttribute("aria-current", "true");
    await vignettes.getByRole("button", { name: "Photo 3 sur 3" }).click();
    await expect(galerie(page)).toContainText("3 sur 3");
    await expect(
      galerie(page).getByRole("img", { name: `${espace.nom}, photo 3 sur 3` }),
    ).toBeVisible();
    await expect(
      vignettes.getByRole("button", { name: "Photo 3 sur 3" }),
    ).toHaveAttribute("aria-current", "true");
    // Les vignettes ne prennent pas la place de la photo : elles restent à sa droite.
    const grande = await galerie(page)
      .getByRole("img", { name: `${espace.nom}, photo 3 sur 3` })
      .boundingBox();
    const colonne = await vignettes.boundingBox();
    expect(colonne!.x).toBeGreaterThan(grande!.x + grande!.width - 1);
    expect(colonne!.width).toBeLessThanOrEqual(200);
  } else {
    await expect(vignettes).toBeHidden();
  }
  // Les deux boutons et les flèches du clavier passent d'une photo à l'autre, sur les deux tailles.
  await page.getByRole("button", { name: "Photo suivante" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(galerie(page)).toContainText(bureau ? "1 sur 3" : "2 sur 3");

  await page.goto(`/ma-copro/espaces/${seule.id}`);
  await expect(
    page.getByRole("img", { name: `${seule.nom}, photo de l'espace commun` }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Photo suivante" }),
  ).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Vignettes" })).toHaveCount(0);
});

for (const [reglage, valeurs] of [
  ["clair", { theme: "clair", taille: "standard" }],
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands caractères", { theme: "clair", taille: "grands" }],
] as const) {
  test(`la fiche d'un espace complet ne défile pas horizontalement et reste lisible, en ${reglage}`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const espace = await nouvelEspaceCommun({
      nom: `Salle des fêtes et de la convivialité ${Date.now()}`,
      description: "Une grande salle lumineuse avec cuisine ouverte.",
      longueur_m: 8,
      largeur_m: 6,
      hauteur_plafond_m: 2.7,
      photos: await Promise.all(
        ["#8f2b00", "#0d3b66", "#00210b", "#273140", "#c4580a"].map((c) =>
          deposerImageEspace(c),
        ),
      ),
      plan_chemin: await deposerImageEspace("#e6eeff", 1280, 800),
    });
    espaces.push(espace.nom);
    await reglerAffichage(resident.id, valeurs);

    await seConnecter(page, resident.email);
    await page.goto(`/ma-copro/espaces/${espace.id}`);
    if (valeurs.theme === "sombre")
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        "sombre",
      );
    if (valeurs.taille === "grands")
      await expect(page.locator("html")).toHaveAttribute(
        "data-taille",
        "grands",
      );
    await expect(
      page.getByRole("heading", { level: 1, name: espace.nom }),
    ).toBeVisible();
    await attendrePhoto(
      galerie(page).getByRole("img", { name: `${espace.nom}, photo 1 sur 5` }),
      1280,
    );
    await attendrePhoto(
      page.getByRole("img", { name: `Plan de situation de ${espace.nom}` }),
      1280,
    );
    await expect(page.getByRole("main")).toContainText("8 m × 6 m, soit 48 m²");
    await expect(page.getByRole("main")).toContainText("2,7 m");

    await verifierSansDefilementHorizontal(page);
    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`fiche-espace-medias-${reglage}.png`),
      fullPage: true,
    });
  });
}

test("le formulaire d'un espace commun ne défile pas horizontalement avec cinq photos et un plan", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const espace = await nouvelEspaceCommun({
    photos: await Promise.all(
      ["#8f2b00", "#0d3b66", "#00210b", "#273140", "#c4580a"].map((c) =>
        deposerImageEspace(c, 640, 360),
      ),
    ),
    plan_chemin: await deposerImageEspace("#e6eeff", 640, 400),
  });
  espaces.push(espace.nom);

  await seConnecter(page, syndic.email);
  await ouvrirModification(page, espace.nom);
  await expect(page.getByRole("main")).toContainText("5 photos sur 5");

  await verifierSansDefilementHorizontal(page);
});
