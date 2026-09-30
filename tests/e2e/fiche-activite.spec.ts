import { writeFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  annulerActivite,
  choisirDate,
  continuerProposer,
  IDENTITE_SYNDIC,
  mettreEnRelecture,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  reglerAffichage,
  saisirLieuLibre,
  supprimerComptes,
  verifierSansDefilementHorizontal,
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
  await expect(page.getByRole("main")).toContainText("Danielle M.");
  await expect(page.getByRole("main")).not.toContainText("Martin");
});

test("une activité du syndic s'affiche comme celle d'un voisin", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const identifiant = await nouvelleActivite(syndic.id, {
    titre: "Atelier bouturage",
    categorie: "jardin_nature",
    pictogramme: "potted_plant",
  });

  await page.goto(`/activites/${identifiant}`);

  await expect(page.getByRole("main")).toContainText(
    "Jardin et nature · Initiative de résident",
  );
  await expect(page.getByRole("main")).not.toContainText("syndic");
});

test("un résident voit le membre du syndic qui organise, comme un voisin", async ({
  page,
}) => {
  const [syndic, resident] = [await nouveauSyndic(), await nouveauResident()];
  emails.push(syndic.email, resident.email);
  const identifiant = await nouvelleActivite(syndic.id);

  await seConnecter(page, resident.email);
  await page.goto(`/activites/${identifiant}`);

  await expect(page.getByRole("main")).toContainText("Proposé par");
  await expect(page.getByRole("main")).toContainText(
    `${IDENTITE_SYNDIC.prenom} ${IDENTITE_SYNDIC.nom.charAt(0)}.`,
  );
  await expect(page.getByRole("main")).not.toContainText("syndic");
  await page.screenshot({
    path: test.info().outputPath("fiche-organisee-par-le-syndic.png"),
    fullPage: true,
  });
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
    "Elle a peut-être été retirée",
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
  await page
    .getByLabel("Catégorie")
    .selectOption({ label: "Jardin et nature" });
  await continuerProposer(page);
  const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await choisirDate(page, dansUnMois);
  await page.getByLabel("Heure de début").selectOption("10:00");
  await page.getByLabel("Heure de fin").selectOption("11:30");
  await saisirLieuLibre(page, "Cour intérieure");
  await continuerProposer(page);
  await continuerProposer(page);
  await page.getByRole("button", { name: /^Publier/ }).click();

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

// Présentation Journal de la fiche (spec #125, ticket #129) : sur ordinateur, l'inscription est une
// carte collante à droite, sans barre d'action fixe ; sur mobile, la barre du bas reste en place.

// Dans « Conseils pratiques » : la description d'une activité est limitée à 600 caractères.
const TEXTE_LONG = Array.from(
  { length: 40 },
  (_, rang) =>
    `Paragraphe ${rang + 1} : un après-midi pour se retrouver autour de crêpes maison et de jeux pour tous les âges.`,
).join("\n\n");

/** Vrai si le bouton, ou un de ses parents, est fixé à la fenêtre : la barre d'action du bas. */
function estDansUneBarreFixe(bouton: Locator) {
  return bouton.evaluate((element) => {
    for (let n: Element | null = element; n; n = n.parentElement) {
      if (getComputedStyle(n).position === "fixed") return true;
    }
    return false;
  });
}

test("sur ordinateur, la carte d'inscription reste visible à droite pendant la lecture", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "La carte est propre à l'ordinateur.");
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const identifiant = await nouvelleActivite(organisateur.id, {
    conseils_pratiques: TEXTE_LONG,
    capacite_max: "12",
  });

  await page.goto(`/activites/${identifiant}`);
  const bouton = page.getByRole("button", { name: "Je participe" });
  const texte = page.getByText("Paragraphe 1 :");
  const boiteTexte = (await texte.boundingBox())!;
  expect((await bouton.boundingBox())!.x).toBeGreaterThan(
    boiteTexte.x + boiteTexte.width,
  );
  await expect(page.getByText("12 places restantes")).toBeAttached();

  // Pendant la lecture, du début à la fin du texte, la carte suit et reste à l'écran.
  for (const position of [0.3, 0.6, 1]) {
    await page.evaluate(
      (p) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * p),
      position,
    );
    await expect(bouton).toBeInViewport();
    await expect(page.getByText("12 places restantes")).toBeInViewport();
  }
  expect(await estDansUneBarreFixe(bouton)).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("fiche-carte-ordinateur.png"),
    fullPage: true,
  });
});

test("sur mobile, l'inscription reste la barre fixée en bas de l'écran", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "La barre du bas est propre au mobile.");
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const identifiant = await nouvelleActivite(organisateur.id, {
    conseils_pratiques: TEXTE_LONG,
  });

  await page.goto(`/activites/${identifiant}`);
  const bouton = page.getByRole("button", { name: "Je participe" });
  await expect(bouton).toBeInViewport();
  expect(await estDansUneBarreFixe(bouton)).toBe(true);
  const { y, height } = (await bouton.boundingBox())!;
  const fenetre = page.viewportSize()!.height;
  expect(y + height).toBeGreaterThan(fenetre - 40);

  // La réserve laisse lire la fin de la fiche au-dessus de la barre.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const fin = (await page
    .getByRole("button", { name: "Copier le lien" })
    .boundingBox())!;
  expect(fin.y + fin.height).toBeLessThan(y);
});

test("la carte d'inscription dit quand les inscriptions sont fermées", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const annulee = await nouvelleActivite(organisateur.id);
  await annulerActivite(annulee);
  const enRelecture = await nouvelleActivite(organisateur.id);
  await mettreEnRelecture(enRelecture, "Une précision à apporter");

  await page.goto(`/activites/${annulee}`);
  await expect(
    page.getByText("L'organisateur a annulé cette activité."),
  ).toBeInViewport();
  await expect(page.getByRole("button", { name: "Je participe" })).toHaveCount(
    0,
  );

  await seConnecter(page, organisateur.email);
  await page.goto(`/activites/${enRelecture}`);
  await expect(
    page.getByText(
      "Cette activité n'est pas publiée : les inscriptions sont fermées.",
    ),
  ).toBeInViewport();
});

for (const [reglage, reglages] of [
  ["clair", { theme: "clair", taille: "standard" }],
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands caractères", { theme: "clair", taille: "grands" }],
] as const) {
  test(`la fiche ne défile pas horizontalement, en ${reglage}`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await reglerAffichage(resident.id, reglages);
    const identifiant = await nouvelleActivite(resident.id, {
      titre: "Le Grand Goûter Crêpes & Jeux du dimanche",
      conseils_pratiques: TEXTE_LONG,
      capacite_max: "12",
    });

    await seConnecter(page, resident.email);
    await page.goto(`/activites/${identifiant}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await verifierSansDefilementHorizontal(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: test.info().outputPath(`fiche-${reglage}.png`),
      fullPage: true,
    });
  });
}

test("le visiteur du lien partagé lit la fiche sans défilement horizontal, carte comprise", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const identifiant = await nouvelleActivite(organisateur.id, {
    titre: "Le Grand Goûter Crêpes & Jeux du dimanche",
    conseils_pratiques: TEXTE_LONG,
    capacite_max: "12",
  });

  await page.goto(`/activites/${identifiant}`);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Je participe" }),
  ).toBeVisible();
  await verifierSansDefilementHorizontal(page);
});

test("avec la réduction des animations, la carte et ses boutons n'animent plus rien", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const organisateur = await nouveauResident("valide");
  emails.push(organisateur.email);
  const identifiant = await nouvelleActivite(organisateur.id);

  await page.goto(`/activites/${identifiant}`);

  const durees = await page
    .getByRole("button", { name: "Je participe" })
    .evaluate((bouton) => getComputedStyle(bouton).transitionDuration);
  expect(durees.split(",").every((d) => parseFloat(d) === 0)).toBe(true);
});
