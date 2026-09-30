import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouvelleAnnonce,
  nouveauResident,
  nouveauSyndic,
  supprimerAnnonces,
  supprimerComptes,
  verifierSansDefilementHorizontal,
} from "./outils";

// Ticket #13 : le conseil syndical publie, épingle, modifie, duplique et supprime des annonces ;
// les résidents les lisent dans l'onglet Annonces ; chaque annonce a un lien public.

const emails: string[] = [];
const titres: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerAnnonces(titres.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

function titreUnique(titre: string) {
  const complet = `${titre} ${randomUUID().slice(0, 6)}`;
  titres.push(complet);
  return complet;
}

function jour(jours: number) {
  return new Date(Date.now() + jours * 86_400_000).toISOString().slice(0, 10);
}

function carte(page: Page, titre: string) {
  return page.getByRole("article").filter({ hasText: titre });
}

function ligneDeGestion(page: Page, titre: string) {
  return page
    .getByRole("list", { name: "Annonces publiées" })
    .getByRole("listitem")
    .filter({ hasText: titre });
}

test("le conseil syndical publie une annonce épinglée, un résident la voit en tête", async ({
  page,
  isMobile,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const titre = titreUnique("Assemblée générale");

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/annonces");
  await expect(
    page.getByRole("heading", { level: 1, name: "Annonces" }),
  ).toBeVisible();
  // Ticket #173 : sur ordinateur, le bouton d'ajout est en tête et dit « Nouvelle annonce ».
  await page
    .getByRole("link", {
      name: isMobile ? "Publier une annonce" : "Nouvelle annonce",
    })
    .click();

  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Donnez un titre à l'annonce.",
  );
  await page.getByLabel("Type").selectOption("assemblee");
  await page.getByLabel("Titre").fill(titre);
  await page.getByLabel("Texte").fill("L'ordre du jour est disponible.");
  await page.getByLabel("Date ou période").fill("Jeudi 12 novembre à 18h30");
  await page.getByLabel("Lieu").fill("Salle commune");
  await page.getByRole("checkbox", { name: /Épingler/ }).check();
  await page.getByLabel("Expire le").fill(jour(30));
  await page.screenshot({
    path: test.info().outputPath("formulaire-annonce.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Publier", exact: true }).click();

  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${titre} » est publiée.`,
  );
  await expect(ligneDeGestion(page, titre)).toContainText("Épinglée");
  await page.screenshot({
    path: test.info().outputPath("annonces-syndic.png"),
    fullPage: true,
  });

  // Une annonce plus récente et non épinglée ne passe pas devant.
  const plusRecente = titreUnique("Plus récente");
  await nouvelleAnnonce({ titre: plusRecente });

  // Le résident, lui, lit l'annonce dans l'onglet Annonces, épinglée en tête.
  await page.context().clearCookies();
  await seConnecter(page, resident.email);
  await page.goto("/annonces");
  await expect(
    page.getByRole("heading", { level: 1, name: "Annonces" }),
  ).toBeVisible();
  // L'ordre se lit entre nos deux annonces : les autres parcours, en parallèle, en publient aussi.
  await expect(carte(page, plusRecente)).toBeVisible();
  const cartes = await page.getByRole("article").allTextContents();
  const rang = (t: string) => cartes.findIndex((texte) => texte.includes(t));
  expect(rang(titre)).toBeGreaterThanOrEqual(0);
  expect(rang(titre)).toBeLessThan(rang(plusRecente));
  const annonce = carte(page, titre);
  await expect(annonce).toContainText("Assemblée générale");
  await expect(annonce).toContainText("Nouveau");
  await expect(annonce).toContainText("par le conseil syndical");
  await expect(annonce).toContainText("Jeudi 12 novembre à 18h30");
  await expect(annonce).toContainText("Salle commune");
  await expect(annonce).toContainText("L'ordre du jour est disponible.");
  // Une annonce se lit : jamais d'inscription.
  await expect(
    annonce.getByRole("button", { name: /participe|inscri/i }),
  ).toHaveCount(0);
  await expect(
    annonce.getByRole("link", { name: /participe|inscri/i }),
  ).toHaveCount(0);
  await expect(
    annonce.getByRole("link", { name: "Relayer sur le groupe WhatsApp" }),
  ).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
  await page.screenshot({
    path: test.info().outputPath("annonces-resident.png"),
    fullPage: true,
  });
});

test("un résident n'accède pas à la gestion des annonces", async ({ page }) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/syndic/annonces");

  await expect(page.getByRole("main")).toContainText(
    "Cet espace est réservé aux membres du conseil syndical.",
  );
  await expect(
    page.getByRole("link", { name: "Publier une annonce" }),
  ).toHaveCount(0);
});

test("les puces filtrent la liste par type", async ({ page }) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const assemblee = titreUnique("AG de printemps");
  const sondage = titreUnique("Horaires du local");
  const travaux = titreUnique("Ravalement");
  const info = titreUnique("Compteurs d'eau");
  await nouvelleAnnonce({ type: "assemblee", titre: assemblee });
  await nouvelleAnnonce({ type: "sondage", titre: sondage });
  await nouvelleAnnonce({ type: "travaux", titre: travaux });
  await nouvelleAnnonce({ type: "info", titre: info });

  await seConnecter(page, resident.email);
  await page.goto("/annonces");
  for (const titre of [assemblee, sondage, travaux, info])
    await expect(carte(page, titre)).toBeVisible();

  await page.getByRole("link", { name: "Assemblées" }).click();
  await expect(carte(page, assemblee)).toBeVisible();
  await expect(carte(page, sondage)).toHaveCount(0);
  await expect(carte(page, travaux)).toHaveCount(0);

  await page.getByRole("link", { name: "Sondages" }).click();
  await expect(carte(page, sondage)).toBeVisible();
  await expect(carte(page, assemblee)).toHaveCount(0);

  await page.getByRole("link", { name: "Travaux et infos" }).click();
  await expect(carte(page, travaux)).toBeVisible();
  await expect(carte(page, info)).toBeVisible();
  await expect(carte(page, sondage)).toHaveCount(0);

  await page.getByRole("link", { name: "Toutes" }).click();
  await expect(carte(page, assemblee)).toBeVisible();
  await expect(carte(page, sondage)).toBeVisible();
});

test("une annonce expirée quitte la liste, mais son lien public reste lisible", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const expiree = await nouvelleAnnonce({
    titre: titreUnique("Coupure d'eau"),
    expire_le: jour(-2),
  });
  const encore = await nouvelleAnnonce({
    titre: titreUnique("Fête des voisins"),
    expire_le: jour(0),
  });

  await seConnecter(page, resident.email);
  await page.goto("/annonces");
  await expect(carte(page, encore.titre)).toBeVisible();
  await expect(carte(page, expiree.titre)).toHaveCount(0);

  await page.goto(`/annonces/${expiree.identifiant_public}`);
  await expect(
    page.getByRole("heading", { level: 1, name: expiree.titre }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText("n'est plus d'actualité");
});

test("un visiteur ouvre le lien public d'une annonce, avec son aperçu riche", async ({
  page,
}) => {
  const annonce = await nouvelleAnnonce({
    type: "travaux",
    titre: titreUnique("Rénovation du hall"),
    texte: "L'entrée se fait par la porte de la cour.",
    quand: "Du 2 au 20 novembre",
    lieu: "Hall du bâtiment A",
  });

  await page.goto(`/annonces/${annonce.identifiant_public}`);

  await expect(
    page.getByRole("heading", { level: 1, name: annonce.titre }),
  ).toBeVisible();
  const article = page.getByRole("article");
  await expect(article).toContainText("Travaux");
  await expect(article).toContainText("Du 2 au 20 novembre");
  await expect(article).toContainText("Hall du bâtiment A");
  await expect(article).toContainText(
    "L'entrée se fait par la porte de la cour.",
  );
  await expect(
    page.getByRole("link", { name: "Relayer sur le groupe WhatsApp" }),
  ).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=.+annonces%2F/);
  await expect(
    page.getByRole("button", { name: /participe|inscri/i }),
  ).toHaveCount(0);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    annonce.titre,
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /Du 2 au 20 novembre/,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    new RegExp(`/annonces/${annonce.identifiant_public}$`),
  );
  await page.screenshot({
    path: test.info().outputPath("annonce-publique.png"),
    fullPage: true,
  });

  await page.goto("/annonces/inconnu00000");
  await expect(page.getByRole("main")).toContainText("introuvable");
});

test("le conseil syndical modifie, épingle, duplique puis supprime une annonce", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const titre = titreUnique("Nettoyage des caves");
  const modifie = titreUnique("Nettoyage des caves reporté");
  await nouvelleAnnonce({ type: "info", titre, quand: "Samedi 7 novembre" });

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/annonces");
  await expect(ligneDeGestion(page, titre)).not.toContainText("Épinglée");

  await ligneDeGestion(page, titre)
    .getByRole("button", { name: /^Épingler/ })
    .click();
  await expect(ligneDeGestion(page, titre)).toContainText("Épinglée");
  await ligneDeGestion(page, titre)
    .getByRole("button", { name: /^Désépingler/ })
    .click();
  await expect(ligneDeGestion(page, titre)).not.toContainText("Épinglée");

  await ligneDeGestion(page, titre)
    .getByRole("link", { name: /^Modifier/ })
    .click();
  await expect(page.getByLabel("Titre")).toHaveValue(titre);
  await page.getByLabel("Titre").fill(modifie);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${modifie} » est enregistrée.`,
  );

  await ligneDeGestion(page, modifie)
    .getByRole("link", { name: /^Dupliquer/ })
    .click();
  await expect(page.getByLabel("Titre")).toHaveValue(modifie);
  await expect(page.getByLabel("Date ou période")).toHaveValue(
    "Samedi 7 novembre",
  );
  await expect(
    page.getByRole("checkbox", { name: /Épingler/ }),
  ).not.toBeChecked();
  const copie = titreUnique("Nettoyage des caves, seconde date");
  await page.getByLabel("Titre").fill(copie);
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${copie} » est publiée.`,
  );
  await expect(ligneDeGestion(page, modifie)).toBeVisible();
  await expect(ligneDeGestion(page, copie)).toBeVisible();

  await ligneDeGestion(page, copie)
    .getByRole("button", { name: /^Supprimer/ })
    .click();
  const feuille = page.getByRole("dialog", {
    name: "Supprimer cette annonce ?",
  });
  await expect(feuille).toContainText(
    "Son lien public ne mènera plus nulle part",
  );
  await feuille.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${copie} » est supprimée.`,
  );
  await expect(ligneDeGestion(page, copie)).toHaveCount(0);
  await expect(ligneDeGestion(page, modifie)).toBeVisible();
});

test("le conseil syndical joint un PDF, que le résident ouvre depuis la carte", async ({
  page,
  request,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const titre = titreUnique("Convocation à l'assemblée");

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/annonces/nouvelle");
  await page.getByLabel("Type").selectOption("assemblee");
  await page.getByLabel("Titre").fill(titre);
  await page.getByLabel("Document PDF").setInputFiles({
    name: "convocation.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 convocation"),
  });
  await expect(page.getByRole("main")).toContainText("convocation.pdf");
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${titre} » est publiée.`,
  );

  await page.context().clearCookies();
  await seConnecter(page, resident.email);
  await page.goto("/annonces");
  const lien = carte(page, titre).getByRole("link", {
    name: "Lire la convocation",
  });
  await expect(lien).toHaveAttribute(
    "href",
    /\/storage\/v1\/object\/public\/annonces\/.+\.pdf$/,
  );
  const reponse = await request.get((await lien.getAttribute("href"))!);
  expect(reponse.status()).toBe(200);
  expect(await reponse.text()).toBe("%PDF-1.4 convocation");
});

test("un document qui n'est pas un PDF est refusé avant l'envoi", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/annonces/nouvelle");
  await page.getByLabel("Document PDF").setInputFiles({
    name: "note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("bonjour"),
  });

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choisissez un document au format PDF.",
  );
});

/** Un PNG d'un pixel : de quoi joindre une vraie photo sans peser dans le dépôt. */
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("une photo jointe illustre la page publique et son aperçu dans WhatsApp", async ({
  page,
  request,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const titre = titreUnique("Nouveau local vélos");

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/annonces/nouvelle");
  await page.getByLabel("Titre").fill(titre);
  await page.getByLabel("Photo").setInputFiles({
    name: "Local vélos.PNG",
    mimeType: "image/png",
    buffer: PIXEL_PNG,
  });
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${titre} » est publiée.`,
  );

  await page
    .getByRole("listitem")
    .filter({ hasText: titre })
    .getByRole("link", { name: /Voir la page publique/ })
    .click();
  const photo = page.getByRole("img", {
    name: `Photo de l'annonce : ${titre}`,
  });
  await expect(photo).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/public\/annonces\/.+\/local-velos\.png$/,
  );
  expect((await request.get((await photo.getAttribute("src"))!)).status()).toBe(
    200,
  );

  const apercu = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  const image = await request.get(apercu!);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

test("l'aperçu d'une annonce sans photo est une image à son titre", async ({
  page,
  request,
}) => {
  const annonce = await nouvelleAnnonce({
    type: "assemblee",
    titre: titreUnique("Assemblée sans photo"),
  });

  await page.goto(`/annonces/${annonce.identifiant_public}`);
  const apercu = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  const image = await request.get(apercu!);

  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

test("les écrans des annonces n'ont aucune violation critique", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const annonce = await nouvelleAnnonce({
    type: "assemblee",
    titre: titreUnique("Assemblée accessible"),
    quand: "Jeudi 12 novembre à 18h30",
    lieu: "Salle commune",
    epinglee: true,
    expire_le: jour(-1),
  });
  await nouvelleAnnonce({ titre: titreUnique("Annonce en cours") });

  await seConnecter(page, syndic.email);
  for (const chemin of [
    "/annonces",
    `/annonces/${annonce.identifiant_public}`,
    "/syndic/annonces",
    "/syndic/annonces/nouvelle",
    `/syndic/annonces/${annonce.id}`,
  ]) {
    await page.goto(chemin);
    await expect(page.getByRole("main")).toBeVisible();
    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    const critiques = resultat.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critiques, `${chemin} : ${JSON.stringify(critiques)}`).toEqual([]);
  }
});

test("le conseil syndical corrige une annonce expirée sans changer son expiration", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const titre = titreUnique("Coupure d'eau terminée");
  const corrige = titreUnique("Coupure d'eau terminée, merci");
  const annonce = await nouvelleAnnonce({ titre, expire_le: jour(-5) });

  await seConnecter(page, syndic.email);
  await page.goto(`/syndic/annonces/${annonce.id}`);
  await page.getByLabel("Titre").fill(corrige);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${corrige} » est enregistrée.`,
  );
  await expect(ligneDeGestion(page, corrige)).toContainText("Expirée");

  await ligneDeGestion(page, corrige)
    .getByRole("link", { name: /^Modifier/ })
    .click();
  await page.getByLabel("Expire le").fill(jour(-1));
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Cette date est déjà passée",
  );
});

test("un visiteur sur Annonces est invité à se connecter pour les lire", async ({
  page,
}) => {
  await page.goto("/annonces");

  await expect(
    page.getByRole("heading", { level: 1, name: "Annonces" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "Connectez-vous pour lire les annonces de la résidence.",
  );
  await expect(page.getByRole("article")).toHaveCount(0);
});

// Ticket #130 (spec #125) : les annonces en présentation Journal sur ordinateur ; le mobile garde
// sa colonne et ses cartes contournées.

test("les annonces se lisent en deux colonnes de cartes sans contour sur ordinateur, en une colonne contournée sur mobile", async ({
  page,
  isMobile,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await nouvelleAnnonce({ titre: titreUnique("Première annonce") });
  await nouvelleAnnonce({ titre: titreUnique("Seconde annonce") });

  await seConnecter(page, resident.email);
  await page.goto("/annonces");
  await expect(page.getByRole("article").nth(1)).toBeVisible();

  const { colonnes, contour } = await page
    .getByRole("article")
    .evaluateAll((cartes) => ({
      colonnes: new Set(
        cartes.map((c) => Math.round(c.getBoundingClientRect().left)),
      ).size,
      contour: getComputedStyle(cartes[0]).borderTopColor,
    }));
  expect(colonnes).toBe(isMobile ? 1 : 2);
  if (isMobile) expect(contour).not.toBe("rgba(0, 0, 0, 0)");
  else expect(contour).toBe("rgba(0, 0, 0, 0)");
  await verifierSansDefilementHorizontal(page);
  await page.screenshot({
    path: test.info().outputPath("annonces-journal.png"),
    fullPage: true,
  });
});

test("sur ordinateur, les puces de filtre passent à la ligne faute de place, sans barre de défilement horizontale", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "présentation Journal : ordinateur seulement");
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/annonces");
  // Une colonne plus étroite que la rangée, comme le ferait un jeu de puces plus long.
  await page.addStyleTag({ content: "main { max-width: 30rem !important; }" });

  const puces = page
    .getByRole("navigation", { name: "Types d'annonce" })
    .getByRole("link");
  await expect(puces).toHaveCount(4);
  const hauts = await puces.evaluateAll((liens) =>
    liens.map((l) => Math.round(l.getBoundingClientRect().top)),
  );
  expect(
    new Set(hauts).size,
    "les puces tiennent sur plusieurs lignes",
  ).toBeGreaterThan(1);
  await verifierSansDefilementHorizontal(page);
});

test("sur ordinateur, la fiche d'une annonce met les infos et les boutons à droite du texte", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "présentation Journal : ordinateur seulement");
  const annonce = await nouvelleAnnonce({
    type: "travaux",
    titre: titreUnique("Rénovation du hall"),
    texte: "L'entrée se fait par la porte de la cour.",
    quand: "Du 2 au 20 novembre",
    lieu: "Hall du bâtiment A",
  });

  await page.goto(`/annonces/${annonce.identifiant_public}`);
  const texte = await page
    .getByText("L'entrée se fait par la porte de la cour.")
    .boundingBox();
  const relais = await page
    .getByRole("link", { name: "Relayer sur le groupe WhatsApp" })
    .boundingBox();
  const infos = await page.getByText("Hall du bâtiment A").boundingBox();
  expect(relais!.x).toBeGreaterThanOrEqual(texte!.x + texte!.width);
  expect(infos!.x).toBeGreaterThanOrEqual(texte!.x + texte!.width);
  await verifierSansDefilementHorizontal(page);
  await page.screenshot({
    path: test.info().outputPath("annonce-journal.png"),
    fullPage: true,
  });
});
