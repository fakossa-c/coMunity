import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  annulerActivite,
  inscrireResident,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  supprimerComptes,
  titreAccueil,
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
  await expect(titreAccueil(page)).toBeVisible();
}

/** La date `AAAA-MM-JJ` dans `jours` jours (négatif : dans le passé), en UTC comme la base. */
function dansJours(jours: number) {
  return new Date(Date.now() + jours * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** « Mardi 27 octobre », comme l'intertitre d'un jour. */
function intituleJour(date: string) {
  const jour = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  return jour.charAt(0).toUpperCase() + jour.slice(1);
}

function catalogue(page: Page) {
  return page.getByRole("region", { name: "Activités à venir" });
}

function carte(page: Page, titre: string) {
  return catalogue(page).getByRole("article").filter({ hasText: titre });
}

test("la salutation donne le prénom et le nombre d'activités de la semaine", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await nouvelleActivite(resident.id, { date_activite: dansJours(0) });

  await seConnecter(page, resident.email);

  await expect(titreAccueil(page)).toHaveText("Bonjour Danielle !");
  await expect(page.getByRole("main")).toContainText(
    /\d+ activités? prévues? cette semaine/,
  );
});

test("les activités à venir sont groupées par jour, « Aujourd’hui » d'abord", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const suffixe = Date.now();
  const tard = `Tricot du soir ${suffixe}`;
  const tot = `Café du matin ${suffixe}`;
  const plusTard = `Pétanque ${suffixe}`;
  const date = dansJours(3);
  await nouvelleActivite(resident.id, {
    titre: tard,
    date_activite: dansJours(0),
    heure_debut: "20:00",
    heure_fin: "21:00",
  });
  await nouvelleActivite(resident.id, {
    titre: tot,
    date_activite: dansJours(0),
    heure_debut: "08:00",
    heure_fin: "09:00",
  });
  await nouvelleActivite(resident.id, { titre: plusTard, date_activite: date });

  await seConnecter(page, resident.email);

  const aujourdhui = catalogue(page).getByRole("region", {
    name: "Aujourd’hui",
  });
  await expect(
    aujourdhui.getByRole("heading", { level: 2, name: "Aujourd’hui" }),
  ).toBeVisible();
  const titres = await aujourdhui
    .getByRole("article")
    .filter({ hasText: String(suffixe) })
    .getByRole("heading")
    .allTextContents();
  expect(titres).toEqual([tot, tard]);

  const jour = catalogue(page).getByRole("region", {
    name: intituleJour(date),
  });
  await expect(jour).toContainText(plusTard);
  await expect(aujourdhui).not.toContainText(plusTard);

  // Les jours se suivent dans l'ordre chronologique.
  const jours = await catalogue(page)
    .getByRole("heading", { level: 2 })
    .allTextContents();
  expect(jours[0]).toBe("Aujourd’hui");
  expect(jours.indexOf(intituleJour(date))).toBeGreaterThan(0);
});

test("les puces filtrent par catégorie, au clavier, et restent collées en haut", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const suffixe = Date.now();
  const jardin = `Rempotage ${suffixe}`;
  const gouter = `Goûter ${suffixe}`;
  await nouvelleActivite(resident.id, {
    titre: jardin,
    categorie: "jardin_nature",
    pictogramme: "potted_plant",
  });
  await nouvelleActivite(resident.id, { titre: gouter });

  await seConnecter(page, resident.email);
  const filtres = page.getByRole("navigation", { name: "Catégories" });
  await expect(filtres.getByRole("link", { name: "Toutes" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  const puce = filtres.getByRole("link", { name: "Jardin & Nature" });
  await puce.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/categorie=jardin_nature/);
  await expect(
    page
      .getByRole("navigation", { name: "Catégories" })
      .getByRole("link", { name: "Jardin & Nature" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(carte(page, jardin)).toBeVisible();
  await expect(carte(page, gouter)).toHaveCount(0);

  // Fenêtre basse : la page défile même avec une seule carte.
  await page.setViewportSize({ width: 360, height: 420 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  const boite = await page
    .getByRole("navigation", { name: "Catégories" })
    .boundingBox();
  expect(boite?.y).toBeLessThanOrEqual(1);
});

test("le tiroir « Détails » se déplie au clavier et montre horaire, lieu, accessibilité et pour qui", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const titre = `Goûter crêpes ${Date.now()}`;
  await nouvelleActivite(resident.id, {
    titre,
    capacite_max: "12",
    etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
  });

  await seConnecter(page, resident.email);
  const laCarte = carte(page, titre);
  await expect(laCarte).toContainText("Moments partagés");
  await expect(laCarte).toContainText("De 16h00 à 18h30");
  await expect(laCarte.getByRole("progressbar")).toBeVisible();

  const details = laCarte.getByRole("button", { name: "Détails" });
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await expect(laCarte.getByText("Jardin partagé")).toBeHidden();

  await details.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("aria-expanded", "true");
  const tiroir = laCarte.getByRole("region", { name: "Détails" });
  await expect(tiroir).toContainText("De 16h00 à 18h30");
  await expect(tiroir).toContainText("Jardin partagé");
  await expect(tiroir).toContainText("Accessibilité");
  await expect(tiroir).toContainText("Accès plain-pied");
  await expect(tiroir).toContainText("Pour qui");
  await expect(tiroir).toContainText("Enfants bienvenus");

  await page.keyboard.press("Space");
  await expect(details).toHaveAttribute("aria-expanded", "false");
});

test("« Voir la fiche » et « Je participe » ouvrent la fiche ; inscrit, la carte dit « J'y vais » sans boutons", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const suffixe = Date.now();
  const libre = `Belote ${suffixe}`;
  const inscrit = `Chorale ${suffixe}`;
  const identifiant = await nouvelleActivite(organisateur.id, {
    titre: libre,
  });
  const identifiantInscrit = await nouvelleActivite(organisateur.id, {
    titre: inscrit,
  });
  await inscrireResident(identifiantInscrit, resident.id, 2);

  await seConnecter(page, resident.email);

  await expect(
    carte(page, libre).getByRole("link", { name: "Voir la fiche" }),
  ).toHaveAttribute("href", `/activites/${identifiant}`);
  await carte(page, libre).getByRole("link", { name: "Je participe" }).click();
  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: libre }),
  ).toBeVisible();

  await page.goto("/");
  const carteInscrit = carte(page, inscrit);
  await expect(carteInscrit).toContainText("J'y vais, avec 2 personnes");
  await expect(
    carteInscrit.getByRole("link", { name: "Je participe" }),
  ).toHaveCount(0);
  await expect(
    carteInscrit.getByRole("link", { name: "Voir la fiche" }),
  ).toHaveCount(0);
  // Le titre mène toujours à la fiche.
  await expect(
    carteInscrit.getByRole("link", { name: inscrit }),
  ).toHaveAttribute("href", `/activites/${identifiantInscrit}`);
});

test("une activité complète ne propose plus « Je participe »", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const voisin = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, voisin.email, resident.email);
  const titre = `Atelier complet ${Date.now()}`;
  const identifiant = await nouvelleActivite(organisateur.id, {
    titre,
    capacite_max: "1",
  });
  await inscrireResident(identifiant, voisin.id);

  await seConnecter(page, resident.email);

  const laCarte = carte(page, titre);
  await expect(
    laCarte.getByRole("link", { name: "Voir la fiche" }),
  ).toBeVisible();
  await expect(laCarte.getByRole("link", { name: "Je participe" })).toHaveCount(
    0,
  );
});

test("une activité du conseil syndical se présente et s'inscrit comme celle d'un voisin", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const titre = `Réunion jardin ${Date.now()}`;
  const identifiant = await nouvelleActivite(syndic.id, { titre });

  await seConnecter(page, resident.email);

  const laCarte = carte(page, titre);
  await expect(laCarte).not.toContainText("syndic");
  await laCarte.getByRole("link", { name: "Je participe" }).click();
  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));
});

test("Activités › J'y vais › Passées montre les activités passées où j'étais inscrit", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const suffixe = Date.now();
  const allee = `Loto de la rentrée ${suffixe}`;
  const recente = `Pique-nique ${suffixe}`;
  const annulee = `Brocante annulée ${suffixe}`;
  const pasInscrit = `Yoga ${suffixe}`;
  const aVenir = `Concert ${suffixe}`;
  for (const [titre, jours] of [
    [allee, -3],
    [annulee, -2],
    [recente, -1],
    [pasInscrit, -1],
    [aVenir, 5],
  ] as const) {
    const identifiant = await nouvelleActivite(organisateur.id, {
      titre,
      date_activite: dansJours(jours),
    });
    if (titre !== pasInscrit) await inscrireResident(identifiant, resident.id);
    if (titre === annulee) await annulerActivite(identifiant);
  }

  await seConnecter(page, resident.email);
  await page.goto("/activites?onglet=j_y_vais&puce=passees");

  const liste = page.getByRole("list", { name: "Vos activités passées" });
  // La plus récente d'abord.
  const titres = await liste
    .getByRole("heading")
    .filter({ hasText: String(suffixe) })
    .allTextContents();
  expect(titres).toEqual([recente, allee]);
  await expect(liste).not.toContainText(annulee);
  await expect(liste).not.toContainText(pasInscrit);
  await expect(liste).not.toContainText(aVenir);
});

test.describe("captures de l'Accueil", () => {
  // Mêmes titres d'une capture à l'autre : une à la fois, pour ne pas mêler leurs cartes.
  test.describe.configure({ mode: "serial" });

  for (const { nom, attributs } of [
    { nom: "clair", attributs: {} },
    { nom: "sombre", attributs: { "data-theme": "sombre" } },
    { nom: "grands-caracteres", attributs: { "data-taille": "grands" } },
  ]) {
    test(`Accueil en ${nom}`, async ({ page }) => {
      const resident = await nouveauResident("valide");
      emails.push(resident.email);
      const inscrit = await nouvelleActivite(resident.id, {
        titre: "Le Grand Goûter Crêpes & Jeux",
        date_activite: dansJours(0),
        capacite_max: "12",
        etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
      });
      await inscrireResident(inscrit, resident.id, 2);
      await nouvelleActivite(resident.id, {
        titre: "Atelier bouturage",
        categorie: "jardin_nature",
        pictogramme: "potted_plant",
        date_activite: dansJours(3),
        heure_debut: "18:00",
        heure_fin: "19:30",
        lieu: "Hall principal & Verrière, RDC",
      });

      await seConnecter(page, resident.email);
      await page.evaluate((valeurs) => {
        for (const [cle, valeur] of Object.entries(valeurs))
          document.documentElement.setAttribute(cle, valeur);
      }, attributs);
      await carte(page, "Atelier bouturage")
        .first()
        .getByRole("button", { name: "Détails" })
        .click();
      // La barre de puces colle : capturée en haut de page, elle reste à sa place.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: test.info().outputPath(`accueil-${nom}.png`),
        fullPage: true,
      });
    });
  }
});
