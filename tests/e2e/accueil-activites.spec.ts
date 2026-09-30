import { expect, test, type Page } from "@playwright/test";
import { jourDecale } from "../../src/lib/calendrier";
import { aujourdhui } from "../../src/lib/partage-activite";
import {
  MOT_DE_PASSE,
  annulerActivite,
  inscrireResident,
  masquerActivite,
  mettreEnRelecture,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  reglerAffichage,
  supprimerComptes,
  titreAccueil,
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
  await expect(titreAccueil(page)).toBeVisible();
}

/**
 * La date `AAAA-MM-JJ` dans `jours` jours (négatif : dans le passé), en heure de Paris comme
 * l'application. Une activité d'aujourd'hui finit à 23h59 : à venir à l'Accueil quelle que soit
 * l'heure du test.
 */
function dansJours(jours: number) {
  return jourDecale(aujourdhui(), jours);
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

/** La carte d'une activité, dans la grille ou dans le bloc « À la une ». */
function carte(page: Page, titre: string) {
  return page.getByRole("main").getByRole("article").filter({ hasText: titre });
}

function aLaUne(page: Page) {
  return page.getByRole("region", { name: "À la une" });
}

test("la salutation donne le prénom et le nombre d'activités de la semaine", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await nouvelleActivite(resident.id, {
    date_activite: dansJours(0),
    heure_fin: "23:59",
  });

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
    heure_fin: "23:59",
  });
  await nouvelleActivite(resident.id, {
    titre: tot,
    date_activite: dansJours(0),
    heure_debut: "08:00",
    heure_fin: "23:59",
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
  // La première activité à venir est dans « À la une », pas dans la grille : ensemble, elles
  // restent dans l'ordre chronologique.
  const enUne = await aLaUne(page)
    .getByRole("heading", { level: 2 })
    .filter({ hasText: String(suffixe) })
    .allTextContents();
  expect([...enUne, ...titres]).toEqual([tot, tard]);

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
  // Une activité plus proche prend « À la une » : celle du test reste dans la grille, avec son tiroir.
  await nouvelleActivite(resident.id, {
    titre: `Plus proche ${Date.now()}`,
    date_activite: dansJours(0),
    heure_fin: "23:59",
    heure_debut: "00:05",
  });
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

test("« Voir la fiche » et « Je participe » ouvrent la fiche ; inscrit, la carte dit « Vous participez » sans boutons", async ({
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
  // Une activité plus proche prend « À la une » : les deux du test restent dans la grille.
  await nouvelleActivite(organisateur.id, {
    titre: `Plus proche ${suffixe}`,
    date_activite: dansJours(0),
    heure_fin: "23:59",
    heure_debut: "00:05",
  });

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
  await expect(carteInscrit).toContainText("Vous participez, avec 2 personnes");
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
        heure_fin: "23:59",
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

// « À la une » : la première activité à venir où l'on peut s'inscrire. Ces tests s'isolent dans une
// catégorie que la suite n'emploie pas ailleurs au même moment (une par projet, ils tournent en
// parallèle) et filtrent l'Accueil dessus : « À la une » suit le filtre de catégorie.
function categorieDeCes(isMobile: boolean) {
  return isMobile ? "entraide_partage" : "creation_bricolage";
}

test("« À la une » montre la prochaine activité ouverte aux inscriptions, retirée de la grille", async ({
  page,
  isMobile,
}) => {
  const categorie = categorieDeCes(isMobile);
  const createur = await nouveauResident("valide");
  const voisin = await nouveauResident("valide");
  emails.push(createur.email, voisin.email);
  const suffixe = Date.now();
  const titre = (nom: string) => `${nom} ${suffixe}`;
  const creer = (nom: string, heure: string, extras = {}) =>
    nouvelleActivite(createur.id, {
      titre: titre(nom),
      categorie,
      date_activite: dansJours(0),
      heure_debut: heure,
      heure_fin: "23:59",
      ...extras,
    });
  await annulerActivite(await creer("Annulée", "07:00"));
  await masquerActivite(await creer("Masquée", "07:10"), "Hors sujet");
  await mettreEnRelecture(await creer("Relecture", "07:20"), "À vérifier");
  const identifiantComplete = await creer("Complète", "07:30", {
    capacite_max: "1",
  });
  await inscrireResident(identifiantComplete, voisin.id);
  await creer("Ouverte", "07:40");
  await creer("Suivante", "08:00");

  await seConnecter(page, createur.email);
  await page.goto(`/?categorie=${categorie}`);

  const enUne = aLaUne(page);
  await expect(
    enUne.getByRole("heading", { level: 2, name: titre("Ouverte") }),
  ).toBeVisible();
  await expect(enUne).toContainText("À la une");
  await expect(enUne).toContainText("De 7h40 à 23h00");
  await expect(enUne.getByRole("link", { name: "Je participe" })).toBeVisible();
  await expect(
    enUne.getByRole("link", { name: "Voir la fiche" }),
  ).toBeVisible();

  // Absente de la grille, qui garde les autres, y compris la complète et l'annulée.
  await expect(catalogue(page)).not.toContainText(titre("Ouverte"));
  await expect(catalogue(page)).toContainText(titre("Suivante"));
  await expect(catalogue(page)).toContainText(titre("Complète"));
  await expect(catalogue(page)).toContainText(titre("Annulée"));
  // Une activité n'est jamais deux fois sur la page.
  await expect(carte(page, titre("Ouverte"))).toHaveCount(1);
});

test("« À la une » disparaît quand aucune activité n'est ouverte aux inscriptions", async ({
  page,
  isMobile,
}) => {
  const categorie = categorieDeCes(isMobile);
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const titre = `Annulée seule ${Date.now()}`;
  await annulerActivite(
    await nouvelleActivite(createur.id, {
      titre,
      categorie,
      date_activite: dansJours(0),
      heure_fin: "23:59",
    }),
  );

  await seConnecter(page, createur.email);
  await page.goto(`/?categorie=${categorie}`);

  await expect(carte(page, titre)).toBeVisible();
  await expect(aLaUne(page)).toHaveCount(0);
  await expect(page.getByText("À la une")).toHaveCount(0);
});

test("un résident inscrit lit « Vous participez » sur le bloc « À la une », sans « Je participe »", async ({
  page,
  isMobile,
}) => {
  const categorie = categorieDeCes(isMobile);
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const titre = `Inscrit à la une ${Date.now()}`;
  const identifiant = await nouvelleActivite(organisateur.id, {
    titre,
    categorie,
    date_activite: dansJours(0),
    heure_fin: "23:59",
    heure_debut: "07:00",
  });
  await inscrireResident(identifiant, resident.id, 2);

  await seConnecter(page, resident.email);
  await page.goto(`/?categorie=${categorie}`);

  const enUne = aLaUne(page);
  await expect(enUne).toContainText(titre);
  await expect(enUne).toContainText("Vous participez, avec 2 personnes");
  await expect(enUne.getByRole("link", { name: "Je participe" })).toHaveCount(
    0,
  );
  await expect(
    enUne.getByRole("link", { name: "Voir la fiche" }),
  ).toHaveAttribute("href", `/activites/${identifiant}`);
});

test("les activités d'un jour se rangent en trois colonnes sur ordinateur, en une colonne sur mobile", async ({
  page,
  isMobile,
}) => {
  const categorie = categorieDeCes(isMobile);
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const suffixe = Date.now();
  // « À la une » prend la première : les quatre suivantes forment la grille du jour.
  for (const [rang, heure] of [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
  ].entries()) {
    await nouvelleActivite(createur.id, {
      titre: `Grille ${rang} ${suffixe}`,
      categorie,
      date_activite: dansJours(0),
      heure_debut: heure,
      heure_fin: "23:59",
    });
  }

  await seConnecter(page, createur.email);
  await page.goto(`/?categorie=${categorie}`);

  await expect(carte(page, `Grille 4 ${suffixe}`)).toBeVisible();
  const positions = [];
  for (const rang of [1, 2, 3, 4]) {
    const boite = await carte(page, `Grille ${rang} ${suffixe}`).boundingBox();
    positions.push({ x: Math.round(boite!.x), y: Math.round(boite!.y) });
  }
  const colonnes = new Set(positions.map(({ x }) => x));
  const rangees = new Set(positions.map(({ y }) => y));
  if (isMobile) {
    expect(colonnes.size).toBe(1);
    expect(rangees.size).toBe(4);
  } else {
    expect(colonnes.size).toBe(3);
    expect(rangees.size).toBe(2);
    // Les trois premières sont côte à côte, dans l'ordre chronologique.
    expect(positions[0].y).toBe(positions[1].y);
    expect(positions[1].y).toBe(positions[2].y);
    expect(positions[0].x).toBeLessThan(positions[1].x);
    expect(positions[1].x).toBeLessThan(positions[2].x);
    expect(positions[3].x).toBe(positions[0].x);
  }
});

test("les puces de filtre passent à la ligne sur ordinateur, défilent sans barre sur mobile", async ({
  page,
  isMobile,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await nouvelleActivite(resident.id, {
    date_activite: dansJours(0),
    heure_fin: "23:59",
  });
  await seConnecter(page, resident.email);

  const puces = page
    .getByRole("navigation", { name: "Catégories" })
    .getByRole("link");
  await expect(puces).toHaveCount(6);
  const hauts = new Set<number>();
  for (const puce of await puces.all()) {
    hauts.add(Math.round((await puce.boundingBox())!.y));
  }
  const rangee = puces.first().locator("..");
  const defilable = await rangee.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  if (isMobile) {
    // Une seule rangée qui défile au doigt.
    expect(hauts.size).toBe(1);
    expect(defilable).toBe(true);
  } else {
    // Rétrécie au plus étroit d'un ordinateur, la rangée passe à la ligne au lieu de défiler.
    await page.setViewportSize({ width: 1024, height: 800 });
    const apres = new Set<number>();
    for (const puce of await puces.all()) {
      apres.add(Math.round((await puce.boundingBox())!.y));
    }
    expect(apres.size).toBeGreaterThan(1);
    expect(
      await rangee.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(false);
  }
  await verifierSansDefilementHorizontal(page);
});

for (const [reglage, valeurs] of [
  ["clair", { theme: "clair", taille: "standard" }],
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands caractères", { theme: "clair", taille: "grands" }],
] as const) {
  test(`l'Accueil garni ne défile pas horizontalement, en ${reglage}`, async ({
    page,
    isMobile,
  }) => {
    const categorie = categorieDeCes(isMobile);
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await reglerAffichage(resident.id, valeurs);
    for (const [rang, heure] of [
      "07:00",
      "08:00",
      "09:00",
      "10:00",
    ].entries()) {
      await nouvelleActivite(resident.id, {
        titre: `Atelier long titre ${rang} ${Date.now()}`,
        categorie,
        date_activite: dansJours(0),
        heure_fin: "23:59",
        heure_debut: heure,
        etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
      });
    }
    await seConnecter(page, resident.email);
    await page.goto(`/?categorie=${categorie}`);
    await expect(aLaUne(page)).toBeVisible();
    await expect(catalogue(page).getByRole("article").first()).toBeVisible();
    await verifierSansDefilementHorizontal(page);
  });
}

test("la préférence de réduction des animations coupe les transitions des cartes de l'Accueil", async ({
  page,
}) => {
  // Une catégorie à part : ce test tourne en même temps que ceux de « À la une ».
  const categorie = "culture_loisirs";
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  for (const heure of ["07:00", "08:00"]) {
    await nouvelleActivite(resident.id, {
      titre: `Sans mouvement ${heure} ${Date.now()}`,
      categorie,
      date_activite: dansJours(0),
      heure_fin: "23:59",
      heure_debut: heure,
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seConnecter(page, resident.email);
  await page.goto(`/?categorie=${categorie}`);

  const durees = await page
    .getByRole("main")
    .getByRole("article")
    .evaluateAll((cartes) =>
      cartes.map((carte) => getComputedStyle(carte).transitionDuration),
    );
  expect(durees.length).toBeGreaterThanOrEqual(2);
  expect(new Set(durees)).toEqual(new Set(["0s"]));
});
