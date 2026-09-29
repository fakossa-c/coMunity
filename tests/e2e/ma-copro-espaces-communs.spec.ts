import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { lireSupabaseLocal } from "../../scripts/supabase-local.mjs";
import {
  MOT_DE_PASSE,
  nouvelEspaceCommun,
  nouveauResident,
  nouveauSyndic,
  nouvelleSectionReglement,
  photoJpeg,
  reglerAffichage,
  supprimerComptes,
  supprimerEspacesCommuns,
  supprimerSectionsReglement,
  verifierSansDefilementHorizontal,
} from "./outils";

// Ticket #55 : les espaces communs définis par le conseil syndical (#11) se lisent dans Ma copro.
// Spec #125, ticket #134 : « Espaces et biens communs » passe avant le règlement intérieur, et
// chaque espace a sa fiche.

const emails: string[] = [];
const espaces: string[] = [];
const titresReglement: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerEspacesCommuns(espaces.splice(0));
  await supprimerSectionsReglement(titresReglement.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

/** La section Espaces et biens communs de Ma copro. */
function sectionEspaces(page: Page) {
  return page.getByRole("region", { name: "Espaces et biens communs" });
}

/** La carte d'un espace commun dans Ma copro, retrouvée par son nom. */
function carte(page: Page, nom: string) {
  return sectionEspaces(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name: nom }) });
}

test("le conseil syndical crée un espace commun avec horaires et contact, un résident le retrouve dans Ma copro, à jour après une modification", async ({
  page,
  browser,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const nom = `Salle des fêtes ${randomUUID().slice(0, 6)}`;
  espaces.push(nom);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/espaces-communs/nouveau");
  await page.getByLabel("Nom").fill(nom);
  await page.getByLabel("Bâtiment").fill("Bâtiment A");
  await page
    .getByLabel("Localisation")
    .fill("Rez-de-chaussée, au fond du hall");
  await page.getByLabel("Capacité").fill("20");
  await page.getByRole("checkbox", { name: "Coin cuisine" }).check();
  await page.getByRole("checkbox", { name: "Accès plain-pied" }).check();
  await page.getByLabel("Consignes").fill("Laissez la salle propre.");
  await page.getByLabel("Horaires d'accès").fill("Tous les jours de 9h à 21h");
  await page.getByLabel("Contact").fill("Colette, gardienne");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nom} » est ajouté aux espaces communs.`,
  );

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
    await expect(
      lecteur.getByRole("heading", { level: 2, name: "Règlement intérieur" }),
    ).toBeVisible();
    await expect(
      lecteur.getByRole("heading", {
        level: 2,
        name: "Espaces et biens communs",
      }),
    ).toBeVisible();

    const fiche = carte(lecteur, nom);
    await expect(fiche).toContainText("Bâtiment A");
    await expect(fiche).toContainText("Rez-de-chaussée, au fond du hall");
    await expect(fiche).toContainText("Tous les jours de 9h à 21h");
    await expect(fiche).toContainText("Colette, gardienne");
    await expect(fiche).toContainText("Jusqu'à 20 personnes");
    await expect(fiche).toContainText("Laissez la salle propre.");
    await expect(
      fiche.getByRole("list", { name: "Équipements" }).getByRole("listitem"),
    ).toHaveText(["Accès plain-pied", "Coin cuisine"]);
    // Avant le règlement intérieur.
    const [yReglement, yEspaces] = await Promise.all([
      lecteur
        .getByRole("heading", { level: 2, name: "Règlement intérieur" })
        .boundingBox(),
      lecteur
        .getByRole("heading", { level: 2, name: "Espaces et biens communs" })
        .boundingBox(),
    ]);
    expect(yEspaces!.y).toBeLessThan(yReglement!.y);
    await lecteur.screenshot({
      path: test.info().outputPath("ma-copro-espaces.png"),
      fullPage: true,
    });

    // Le conseil syndical modifie l'espace : Ma copro le montre à jour au rechargement.
    await page.goto("/syndic/espaces-communs");
    await page.getByRole("link", { name: `Modifier : ${nom}` }).click();
    await page.getByLabel("Contact").fill("Bernard, président du conseil");
    await page.getByLabel("Capacité").fill("25");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("status")).toContainText(
      `« ${nom} » est enregistré.`,
    );

    await lecteur.reload();
    await expect(carte(lecteur, nom)).toContainText(
      "Bernard, président du conseil",
    );
    await expect(carte(lecteur, nom)).toContainText("Jusqu'à 25 personnes");
    await expect(carte(lecteur, nom)).not.toContainText("Colette, gardienne");
  } finally {
    await contexte.close();
  }
});

test("un champ non renseigné n'apparaît pas dans la carte de l'espace", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun({
    batiment: null,
    capacite: null,
    equipements: [],
    heure_fin_max: null,
    consignes: null,
  });
  espaces.push(espace.nom);

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");

  const fiche = carte(page, espace.nom);
  await expect(fiche).toBeVisible();
  await expect(fiche).toContainText(espace.nom);
  await expect(
    fiche.getByRole("link", { name: `Voir le détail : ${espace.nom}` }),
  ).toBeVisible();
  await expect(fiche.locator("dl")).toHaveCount(0);
  await expect(fiche.getByText("Horaires d'accès")).toHaveCount(0);
  await expect(fiche.getByText("Contact")).toHaveCount(0);
  await expect(fiche.getByText("Capacité")).toHaveCount(0);
  await expect(fiche.getByText("Consignes")).toHaveCount(0);
  await expect(fiche.getByRole("list", { name: "Équipements" })).toHaveCount(0);
});

test("un résident en attente de validation et le conseil syndical lisent les espaces communs", async ({
  page,
  browser,
}) => {
  const attente = await nouveauResident("en_attente");
  const syndic = await nouveauSyndic();
  emails.push(attente.email, syndic.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);

  await seConnecter(page, attente.email);
  await page.goto("/ma-copro");
  await expect(carte(page, espace.nom)).toBeVisible();

  const contexte = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    locale: "fr-FR",
  });
  const membre = await contexte.newPage();
  try {
    await seConnecter(membre, syndic.email);
    await membre.goto("/ma-copro");
    await expect(carte(membre, espace.nom)).toBeVisible();
  } finally {
    await contexte.close();
  }
});

test("un résident refusé ne lit pas les espaces communs, un visiteur est conduit à la connexion", async ({
  page,
  browser,
}) => {
  const resident = await nouveauResident("refuse");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun();
  espaces.push(espace.nom);

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");
  await expect(page.getByRole("main")).toContainText("Compte non accepté");
  await expect(page.getByRole("main")).not.toContainText(espace.nom);

  const contexte = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const visiteur = await contexte.newPage();
  try {
    await visiteur.goto("/ma-copro");
    await expect(visiteur).toHaveURL(/\/connexion\?suivant=%2Fma-copro/);
  } finally {
    await contexte.close();
  }
});

for (const theme of ["clair", "sombre"] as const) {
  test(`les espaces communs sont lisibles en grands caractères et en thème ${theme}, sans violation d'accessibilité`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const espace = await nouvelEspaceCommun({
      localisation: "Rez-de-chaussée, à gauche du hall",
      description: "Une grande pièce claire avec une cuisine.",
      horaires_acces: "Tous les jours de 9h à 21h",
      contact: "Colette, gardienne : 06 12 34 56 78",
    });
    espaces.push(espace.nom);
    await reglerAffichage(resident.id, { theme, taille: "grands" });

    await seConnecter(page, resident.email);
    await page.goto("/ma-copro");
    if (theme === "sombre")
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        "sombre",
      );
    await expect(page.locator("html")).toHaveAttribute("data-taille", "grands");
    await expect(carte(page, espace.nom)).toBeVisible();

    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`ma-copro-espaces-${theme}-grands.png`),
      fullPage: true,
    });
  });
}

/** Dépose une photo pour l'espace, comme la saisie du conseil syndical le fait. */
async function poserPhotoEspace(id: string) {
  const local = lireSupabaseLocal();
  const admin = createClient(local.url, local.cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const chemin = `${randomUUID()}.jpg`;
  const depot = await admin.storage
    .from("espaces-communs")
    .upload(chemin, await photoJpeg("#8f2b00", 1280, 720), {
      contentType: "image/jpeg",
    });
  if (depot.error) throw depot.error;
  const { error } = await admin
    .from("espace_commun")
    .update({ photo_chemin: chemin })
    .eq("id", id);
  if (error) throw error;
}

/** Un espace complet, dont les consignes tiennent sur quatre lignes. */
async function espaceComplet(champs = {}) {
  const espace = await nouvelEspaceCommun({
    batiment: "Bâtiment A",
    localisation: "Rez-de-chaussée",
    description: "Une grande salle lumineuse avec cuisine ouverte.",
    capacite: 30,
    horaires_acces: "De 8h00 à 22h00, tous les jours",
    contact: "Colette, gardienne",
    consignes:
      "Rangez les chaises avant de partir.\nÉteignez la cuisine et les lumières.\nLa musique s'arrête à 22h00.\nSignalez toute casse au conseil syndical.",
    ...champs,
  });
  espaces.push(espace.nom);
  return espace;
}

test("Ma copro présente les espaces et biens communs avant le règlement intérieur, avec un sommaire qui reste visible sur ordinateur", async ({
  page,
  isMobile,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await espaceComplet();
  // Un règlement assez long, une fois déplié, pour que la page défile au-delà d'un écran. Seul
  // ce test lit le titre de ses sections : celles des autres tests, au même moment, s'y ajoutent.
  const paragraphes = Array.from(
    { length: 12 },
    (_, i) =>
      `Paragraphe ${i + 1} : ${"un texte assez long pour la ligne. ".repeat(8)}`,
  ).join("\n\n");
  const sections: string[] = [];
  for (let i = 0; i < 3; i++) {
    const section = await nouvelleSectionReglement({
      titre: `Section ${randomUUID().slice(0, 6)}`,
      texte: paragraphes,
    });
    titresReglement.push(section.titre);
    sections.push(section.titre);
  }

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");

  const espacesTitre = page.getByRole("heading", {
    level: 2,
    name: "Espaces et biens communs",
  });
  const reglementTitre = page.getByRole("heading", {
    level: 2,
    name: "Règlement intérieur",
  });
  await expect(espacesTitre).toBeVisible();
  const [yEspaces, yReglement] = [
    (await espacesTitre.boundingBox())!.y,
    (await reglementTitre.boundingBox())!.y,
  ];
  expect(yEspaces).toBeLessThan(yReglement);

  const sommaire = page.getByRole("navigation", {
    name: "Sommaire du règlement",
  });
  if (isMobile) {
    await expect(sommaire).toBeHidden();
    return;
  }
  // Sur ordinateur : le lien vers les espaces d'abord, puis les sections du règlement, dans l'ordre.
  await expect(sommaire).toBeVisible();
  const liens = await sommaire.getByRole("link").allTextContents();
  expect(liens[0]).toBe("Espaces et biens communs");
  // Les sections des autres tests peuvent s'intercaler : on ne compare que les nôtres.
  expect(liens.filter((texte) => sections.includes(texte))).toEqual(sections);

  // Il reste visible quand on descend au bout d'un règlement déplié.
  await page.getByRole("button", { name: "Tout déplier" }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(sommaire).toBeInViewport();
});

test("un lien du sommaire ouvre la section du règlement qu'il désigne", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Le sommaire est propre à l'ordinateur.");
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const section = await nouvelleSectionReglement();
  titresReglement.push(section.titre);

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");
  const sommaire = page.getByRole("navigation", {
    name: "Sommaire du règlement",
  });
  await sommaire.getByRole("link", { name: section.titre }).click();

  await expect(
    page.getByRole("button", { name: section.titre, exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: section.titre })).toBeVisible();
});

test("une carte ouvre la fiche de l'espace : ce qui est renseigné, « Proposer une activité ici » et le retour vers Ma copro", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await espaceComplet();

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");
  await carte(page, espace.nom)
    .getByRole("link", { name: `Voir le détail : ${espace.nom}` })
    .click();

  await expect(page).toHaveURL(new RegExp(`/ma-copro/espaces/${espace.id}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: espace.nom }),
  ).toBeVisible();
  const principal = page.getByRole("main");
  await expect(principal).toContainText("Bâtiment A · Rez-de-chaussée");
  await expect(principal).toContainText(
    "Une grande salle lumineuse avec cuisine ouverte.",
  );
  await expect(principal).toContainText("Jusqu'à 30 personnes");
  await expect(principal).toContainText("De 8h00 à 22h00, tous les jours");
  await expect(principal).toContainText("Colette, gardienne");
  await expect(
    principal.getByRole("list", { name: "Équipements" }).getByRole("listitem"),
  ).toHaveText(["Accès plain-pied", "Coin cuisine"]);
  await page.screenshot({
    path: test.info().outputPath("fiche-espace-commun.png"),
    fullPage: true,
  });

  // Proposer s'ouvre avec le lieu en paramètre : Proposer le lit (ticket suivant).
  await principal
    .getByRole("link", { name: "Proposer une activité ici" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/proposer\\?espace=${espace.id}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();

  // Le retour ramène à Ma copro.
  await page.goBack();
  await page.getByRole("link", { name: "Ma copro", exact: true }).click();
  await expect(page).toHaveURL(/\/ma-copro$/);
});

test("la fiche montre la photo de l'espace en tête, avec son texte alternatif", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await espaceComplet();
  await poserPhotoEspace(espace.id);

  await seConnecter(page, resident.email);
  await page.goto(`/ma-copro/espaces/${espace.id}`);

  const photo = page
    .getByRole("main")
    .getByRole("img", { name: `${espace.nom}, photo de l'espace commun` });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const titre = page.getByRole("heading", { level: 1, name: espace.nom });
  expect((await photo.boundingBox())!.y).toBeLessThan(
    (await titre.boundingBox())!.y,
  );
});

test("les consignes de la fiche se déplient doucement, leurs lignes restent dans la page", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await espaceComplet();

  await seConnecter(page, resident.email);
  await page.goto(`/ma-copro/espaces/${espace.id}`);

  const consignes = page.getByRole("region", { name: "Consignes" });
  await expect(consignes).toContainText("Rangez les chaises avant de partir.");
  await expect(consignes).toContainText("Éteignez la cuisine et les lumières.");
  const suite = consignes.getByText("La musique s'arrête à 22h00.");
  const depliage = consignes.locator(".depliage");
  const hauteur = async () => (await depliage.boundingBox())!.height;
  // Dans le DOM, mais replié : sans hauteur, transparent et inerte (ni cliquable ni lu).
  await expect(suite).toHaveCount(1);
  await expect(depliage).toHaveAttribute("inert", "");
  await expect(depliage).toHaveCSS("opacity", "0");
  expect(await hauteur()).toBe(0);
  // Le bouton change de nom en dépliant : on le retrouve comme le seul de la carte.
  const bouton = consignes.getByRole("button");
  await expect(bouton).toHaveText("Lire toutes les consignes");
  await expect(bouton).toHaveAttribute("aria-expanded", "false");

  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "true");
  await expect(bouton).toHaveText("Réduire les consignes");
  await expect(depliage).not.toHaveAttribute("inert", "");
  await expect(depliage).toHaveCSS("opacity", "1");
  await expect.poll(hauteur).toBeGreaterThan(40);
  await expect(suite).toBeVisible();
  await expect(
    consignes.getByText("Signalez toute casse au conseil syndical."),
  ).toBeVisible();

  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "false");
  await expect(depliage).toHaveAttribute("inert", "");
  await expect.poll(hauteur).toBe(0);
  await expect(suite).toHaveCount(1);
});

test("avec la préférence de réduction des animations, le dépliage des consignes n'a plus de transition", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await espaceComplet();
  await page.emulateMedia({ reducedMotion: "reduce" });

  await seConnecter(page, resident.email);
  await page.goto(`/ma-copro/espaces/${espace.id}`);

  const consignes = page.getByRole("region", { name: "Consignes" });
  const depliage = consignes.locator(".depliage");
  await expect(depliage).toHaveCount(1);
  expect(
    await depliage.evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toMatch(/^0s(, 0s)*$/);
});

test("un champ non renseigné n'apparaît pas sur la fiche, ni carte ni bouton vides", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await nouvelEspaceCommun({
    batiment: null,
    capacite: null,
    equipements: [],
    heure_fin_max: null,
    consignes: null,
  });
  espaces.push(espace.nom);

  await seConnecter(page, resident.email);
  await page.goto(`/ma-copro/espaces/${espace.id}`);

  const principal = page.getByRole("main");
  await expect(
    principal.getByRole("heading", { level: 1, name: espace.nom }),
  ).toBeVisible();
  for (const absent of [
    "Capacité",
    "Horaires d'accès",
    "Contact",
    "Consignes",
    "Lire toutes les consignes",
    "Caractéristiques",
  ])
    await expect(principal.getByText(absent)).toHaveCount(0);
  await expect(
    principal.getByRole("list", { name: "Équipements" }),
  ).toHaveCount(0);
  await expect(
    principal.getByRole("link", { name: "Proposer une activité ici" }),
  ).toBeVisible();
});

test("la fiche d'un espace inconnu dit qu'elle est introuvable, un résident refusé n'y lit rien, un visiteur va à la connexion", async ({
  page,
  browser,
}) => {
  const resident = await nouveauResident("valide");
  const refuse = await nouveauResident("refuse");
  emails.push(resident.email, refuse.email);
  const espace = await espaceComplet();

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro/espaces/00000000-0000-0000-0000-000000000000");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" }),
  ).toBeVisible();
  await page.goto("/ma-copro/espaces/pas-un-identifiant");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" }),
  ).toBeVisible();

  const { baseURL } = test.info().project.use;
  const contexte = await browser.newContext({ baseURL, locale: "fr-FR" });
  const autre = await contexte.newPage();
  try {
    await seConnecter(autre, refuse.email);
    await autre.goto(`/ma-copro/espaces/${espace.id}`);
    await expect(autre.getByRole("main")).toContainText("Compte non accepté");
    await expect(autre.getByRole("main")).not.toContainText(espace.nom);

    const visiteur = await browser.newContext({ baseURL });
    const anonyme = await visiteur.newPage();
    try {
      await anonyme.goto(`/ma-copro/espaces/${espace.id}`);
      await expect(anonyme).toHaveURL(/\/connexion\?suivant=/);
    } finally {
      await visiteur.close();
    }
  } finally {
    await contexte.close();
  }
});

test("Ma copro et la fiche d'un espace ne défilent jamais horizontalement, avec un nom très long", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const espace = await espaceComplet({
    nom: `Salle-${"très-longue-".repeat(4)}${randomUUID().slice(0, 6)}`,
    contact: "a".repeat(60),
    horaires_acces: "b".repeat(100),
  });
  for (const [theme, taille] of [
    ["clair", "standard"],
    ["sombre", "standard"],
    ["clair", "grands"],
  ] as const) {
    await reglerAffichage(resident.id, { theme, taille });
    if (theme === "clair" && taille === "standard")
      await seConnecter(page, resident.email);
    for (const chemin of ["/ma-copro", `/ma-copro/espaces/${espace.id}`]) {
      await page.goto(chemin);
      await page.getByRole("heading", { level: 1 }).first().waitFor();
      await verifierSansDefilementHorizontal(page);
    }
  }
});

for (const theme of ["clair", "sombre"] as const) {
  test(`la fiche d'un espace est lisible en grands caractères et en thème ${theme}, sans violation d'accessibilité`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const espace = await espaceComplet();
    await reglerAffichage(resident.id, { theme, taille: "grands" });

    await seConnecter(page, resident.email);
    await page.goto(`/ma-copro/espaces/${espace.id}`);
    if (theme === "sombre")
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        "sombre",
      );
    await expect(page.locator("html")).toHaveAttribute("data-taille", "grands");
    await expect(
      page.getByRole("heading", { level: 1, name: espace.nom }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lire toutes les consignes" })
      .click();

    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`fiche-espace-${theme}-grands.png`),
      fullPage: true,
    });
  });
}
