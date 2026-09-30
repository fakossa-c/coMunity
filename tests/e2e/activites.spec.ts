import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  annulerActivite,
  choisirDate,
  continuerProposer,
  inscrireResident,
  laisserRetour,
  MOT_DE_PASSE,
  nouveauResident,
  nouvelleActivite,
  reglerAffichage,
  saisirLieuLibre,
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

test("un résident validé crée une activité et la retrouve dans le catalogue", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Activités" })
    .click();
  // Le bouton flottant du mobile, ou « Proposer » de la barre du haut sur ordinateur.
  await page.getByRole("link", { name: "Proposer" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();

  const titre = "Atelier compost du jeudi";
  await page.getByLabel("Titre de l'activité").fill(titre);
  await page.getByLabel("Catégorie").selectOption({ label: "Jardin et nature" });
  await page
    .getByLabel("Mot d'accueil")
    .fill("On apprend à composter ensemble, dans la cour.");
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
  await page.getByRole("link", { name: "Retour : Accueil" }).click();

  await expect(titreAccueil(page)).toBeVisible();
  // Seule activité à venir, elle est dans le bloc « À la une » plutôt que dans la grille.
  const accueil = page.getByRole("main");
  await expect(accueil).toContainText(titre);
  await expect(accueil).toContainText("Cour intérieure");
  await page.screenshot({
    path: test.info().outputPath("catalogue-activite.png"),
    fullPage: true,
  });
});

test("un résident en attente ne voit pas le formulaire de création", async ({
  page,
}) => {
  const resident = await nouveauResident("en_attente");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/proposer");

  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();
  await expect(page.getByLabel("Titre de l'activité")).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(
    "Vous pourrez proposer une activité dès que votre compte sera validé",
  );
});

function styleCalcule(cible: Locator, propriete: string) {
  return cible.evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p),
    propriete,
  );
}

/** La date `AAAA-MM-JJ` dans `jours` jours (négatif : dans le passé), en UTC comme la base. */
function dansJours(jours: number) {
  return new Date(Date.now() + jours * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

const segments = (page: Page) =>
  page.getByRole("navigation", { name: "Mes activités" });
const segment = (page: Page, nom: string) =>
  segments(page).getByRole("link", { name: new RegExp(`^${nom}`) });
const jeParticipe = (page: Page) =>
  page.getByRole("list", { name: "Activités où vous participez" });
const jOrganise = (page: Page) =>
  page.getByRole("list", { name: "Activités que vous organisez" });
const archivees = (page: Page) =>
  page.getByRole("list", { name: "Activités archivées" });

/**
 * Un résident et ses activités : deux à venir où il participe, une à venir qu'il organise, une
 * passée qu'il organisait, deux passées où il était inscrit (dont une annulée, qui n'est pas
 * comptée, et une plus ancienne) et une passée où il n'était pas inscrit.
 */
async function residentAvecActivites(suffixe: number | string = Date.now()) {
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const titres = {
    participeProche: `Café ${suffixe}`,
    participeLointaine: `Jeux de société ${suffixe}`,
    organiseAVenir: `Atelier tricot ${suffixe}`,
    organiseePassee: `Troc de graines ${suffixe}`,
    suivieRecente: `Pique-nique ${suffixe}`,
    suivieAncienne: `Loto ${suffixe}`,
    suivieAnnulee: `Brocante annulée ${suffixe}`,
    pasInscrit: `Yoga ${suffixe}`,
  };
  const identifiants: Record<string, string> = {};
  for (const [cle, organisateurId, jours, inscrit] of [
    ["participeProche", organisateur.id, 2, true],
    ["participeLointaine", organisateur.id, 9, true],
    ["organiseAVenir", resident.id, 5, false],
    ["organiseePassee", resident.id, -3, false],
    ["suivieRecente", organisateur.id, -1, true],
    ["suivieAncienne", organisateur.id, -20, true],
    ["suivieAnnulee", organisateur.id, -2, true],
    ["pasInscrit", organisateur.id, -1, false],
  ] as const) {
    const identifiant = await nouvelleActivite(organisateurId, {
      titre: titres[cle],
      date_activite: dansJours(jours),
    });
    identifiants[cle] = identifiant;
    if (inscrit) await inscrireResident(identifiant, resident.id);
    if (cle === "suivieAnnulee") await annulerActivite(identifiant);
  }
  return { resident, titres, identifiants };
}

test.describe("les segments de l'écran Activités", () => {
  test("trois segments avec leur compteur, « Je participe » d'abord ; « Passées » n'existe plus", async ({
    page,
  }) => {
    const { resident } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    await expect(segments(page).getByRole("link")).toHaveText([
      /^Je participe\s*2 activités$/,
      /^J'organise\s*1 activité$/,
      /^Archivées\s*3 activités$/,
    ]);
    await expect(segment(page, "Je participe")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(segment(page, "J'organise")).not.toHaveAttribute(
      "aria-current",
    );
    await expect(page.getByRole("link", { name: /Passées/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /J'y vais/ })).toHaveCount(0);
  });

  test("le segment actif est plein pêche, les autres sans fond", async ({
    page,
  }) => {
    const { resident } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    const actif = segment(page, "Je participe");
    // Pêche d'action (--color-fond-action : #ffdbd0), en fond plein.
    expect(await styleCalcule(actif, "background-color")).toBe(
      "rgb(255, 219, 208)",
    );
    expect(
      await styleCalcule(segment(page, "Archivées"), "background-color"),
    ).toBe("rgba(0, 0, 0, 0)");

    await segment(page, "Archivées").click();
    await expect(page).toHaveURL(/onglet=archivees/);
    expect(
      await styleCalcule(segment(page, "Archivées"), "background-color"),
    ).toBe("rgb(255, 219, 208)");
    expect(
      await styleCalcule(segment(page, "Je participe"), "background-color"),
    ).toBe("rgba(0, 0, 0, 0)");
  });

  test("« Je participe » ne montre que les inscriptions à venir, la plus proche d'abord", async ({
    page,
  }) => {
    const { resident, titres } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    await expect(jeParticipe(page).getByRole("heading")).toHaveText([
      titres.participeProche,
      titres.participeLointaine,
    ]);
    await expect(page.getByRole("main")).not.toContainText(
      titres.organiseAVenir,
    );
  });

  test("« J'organise » montre les activités organisées à venir, sans les passées", async ({
    page,
  }) => {
    const { resident, titres } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites");
    await segment(page, "J'organise").click();

    await expect(page).toHaveURL(/onglet=j_organise/);
    await expect(jOrganise(page).getByRole("heading")).toHaveText([
      titres.organiseAVenir,
    ]);
    await expect(page.getByRole("main")).not.toContainText(
      titres.organiseePassee,
    );
  });

  test("« Archivées » réunit les activités passées organisées ou suivies, chacune avec son rôle, la plus récente d'abord", async ({
    page,
  }) => {
    const { resident, titres } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites?onglet=archivees");

    const lignes = archivees(page).getByRole("listitem");
    await expect(lignes.getByRole("heading")).toHaveText([
      titres.suivieRecente,
      titres.organiseePassee,
      titres.suivieAncienne,
    ]);
    await expect(lignes.nth(0)).toContainText("Vous y avez participé");
    await expect(lignes.nth(1)).toContainText("Organisée par vous");
    await expect(lignes.nth(2)).toContainText("Vous y avez participé");
    // Ni l'annulée qu'on n'a pas suivie, ni la passée où l'on n'était pas, ni les activités à venir.
    for (const titre of [
      titres.suivieAnnulee,
      titres.pasInscrit,
      titres.participeProche,
      titres.organiseAVenir,
    ]) {
      await expect(page.getByRole("main")).not.toContainText(titre);
    }
  });

  test("une activité passée suivie propose de donner son avis ; une organisée, de la dupliquer", async ({
    page,
  }) => {
    const { resident, titres, identifiants } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites?onglet=archivees");

    const suivie = archivees(page)
      .getByRole("listitem")
      .filter({ hasText: titres.suivieRecente });
    const organisee = archivees(page)
      .getByRole("listitem")
      .filter({ hasText: titres.organiseePassee });
    await expect(suivie.getByRole("link", { name: "Nouvelle date" })).toHaveCount(
      0,
    );
    await expect(
      organisee.getByRole("link", { name: "Donner mon avis" }),
    ).toHaveCount(0);

    await expect(
      organisee.getByRole("link", { name: "Nouvelle date" }),
    ).toHaveAttribute(
      "href",
      `/proposer?copie=${identifiants.organiseePassee}`,
    );
    await suivie.getByRole("link", { name: "Donner mon avis" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/activites/${identifiants.suivieRecente}$`),
    );
    await expect(
      page.getByText("Comment était cette activité ?"),
    ).toBeVisible();
  });

  test("une activité passée dont l'avis est déjà donné montre la note à la place de « Donner mon avis »", async ({
    page,
  }) => {
    const { resident, titres, identifiants } = await residentAvecActivites();
    await laisserRetour(
      identifiants.suivieRecente,
      resident.id,
      4,
      "Chouette moment.",
    );
    await seConnecter(page, resident.email);
    await page.goto("/activites?onglet=archivees");

    const donne = archivees(page)
      .getByRole("listitem")
      .filter({ hasText: titres.suivieRecente });
    const attendu = archivees(page)
      .getByRole("listitem")
      .filter({ hasText: titres.suivieAncienne });
    await expect(donne.getByText("Votre avis : 4 sur 5")).toBeVisible();
    await expect(
      donne.getByRole("link", { name: "Donner mon avis" }),
    ).toHaveCount(0);
    // Sans avis, la ligne propose toujours d'en donner un, et ne montre aucune note.
    await expect(
      attendu.getByRole("link", { name: "Donner mon avis" }),
    ).toBeVisible();
    await expect(attendu.getByText(/Votre avis :/)).toHaveCount(0);
  });

  test("une ligne archivée ouvre la fiche de l'activité", async ({ page }) => {
    const { resident, titres, identifiants } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites?onglet=archivees");

    await archivees(page)
      .getByRole("link", { name: titres.suivieAncienne, exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/activites/${identifiants.suivieAncienne}$`),
    );
  });

  test("les segments d'un résident sans activité disent quoi faire", async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    await expect(segments(page).getByRole("link")).toHaveText([
      /0 activité$/,
      /0 activité$/,
      /0 activité$/,
    ]);
    await expect(page.getByRole("main")).toContainText(
      "Aucune inscription à venir",
    );
    await segment(page, "Archivées").click();
    await expect(page.getByRole("main")).toContainText(
      "Vos activités passées, organisées ou suivies, apparaîtront ici.",
    );
  });

  test("les segments collent en haut de l'écran", async ({ page }) => {
    const { resident } = await residentAvecActivites();
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    const bloc = segments(page).locator(
      "xpath=ancestor::*[contains(@class,'sticky')][1]",
    );
    expect(await styleCalcule(bloc, "position")).toBe("sticky");
    expect(await styleCalcule(bloc, "top")).toBe("0px");
  });
});

test("les cartes d'« Activités » se rangent en trois colonnes sur ordinateur, en une seule sur mobile", async ({
  page,
  isMobile,
}) => {
  const organisateur = await nouveauResident("valide");
  const resident = await nouveauResident("valide");
  emails.push(organisateur.email, resident.email);
  const suffixe = Date.now();
  for (const [rang, jours] of [1, 2, 3, 4].entries()) {
    const identifiant = await nouvelleActivite(organisateur.id, {
      titre: `Rendez-vous ${rang} ${suffixe}`,
      date_activite: dansJours(jours),
    });
    await inscrireResident(identifiant, resident.id);
    await nouvelleActivite(resident.id, {
      titre: `Mon rendez-vous ${rang} ${suffixe}`,
      date_activite: dansJours(jours),
    });
  }
  await seConnecter(page, resident.email);
  await page.goto("/activites");

  const positions = async (liste: Locator) => {
    const cartes = await liste.getByRole("article").all();
    return Promise.all(cartes.map((carte) => carte.boundingBox()));
  };
  const participe = (await positions(jeParticipe(page))).map((b) => b!);
  expect(participe).toHaveLength(4);
  if (isMobile) {
    expect(new Set(participe.map((b) => Math.round(b.x))).size).toBe(1);
  } else {
    expect(participe[0].y).toBe(participe[1].y);
    expect(participe[1].y).toBe(participe[2].y);
    expect(participe[0].x).toBeLessThan(participe[1].x);
    expect(participe[1].x).toBeLessThan(participe[2].x);
    expect(participe[3].x).toBe(participe[0].x);
    expect(participe[3].y).toBeGreaterThan(participe[0].y);
  }

  await segment(page, "J'organise").click();
  const organise = (await positions(jOrganise(page))).map((b) => b!);
  expect(organise).toHaveLength(4);
  if (isMobile) {
    expect(new Set(organise.map((b) => Math.round(b.x))).size).toBe(1);
  } else {
    expect(organise[0].y).toBe(organise[1].y);
    expect(organise[0].x).toBeLessThan(organise[1].x);
    expect(organise[2].x).toBe(organise[0].x);
  }
});

for (const [reglage, valeurs] of [
  ["clair", { theme: "clair", taille: "standard" }],
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands caractères", { theme: "clair", taille: "grands" }],
] as const) {
  test(`l'écran Activités garni ne défile pas horizontalement, en ${reglage}`, async ({
    page,
  }) => {
    const { resident } = await residentAvecActivites(
      `au titre assez long ${Date.now() % 1_000_000}`,
    );
    await reglerAffichage(resident.id, valeurs);
    await seConnecter(page, resident.email);

    for (const [onglet, nom] of [
      ["", "Je participe"],
      ["?onglet=j_organise", "J'organise"],
      ["?onglet=archivees", "Archivées"],
    ]) {
      await page.goto(`/activites${onglet}`);
      await expect(segment(page, nom)).toHaveAttribute("aria-current", "page");
      await verifierSansDefilementHorizontal(page);
    }
  });
}

test("la préférence de réduction des animations coupe les transitions de l'écran Activités", async ({
  page,
}) => {
  const { resident } = await residentAvecActivites();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seConnecter(page, resident.email);
  await page.goto("/activites");

  const durees = await segments(page)
    .getByRole("link")
    .evaluateAll((onglets) =>
      onglets.map((onglet) => getComputedStyle(onglet).transitionDuration),
    );
  expect(durees).toHaveLength(3);
  expect(new Set(durees)).toEqual(new Set(["0s"]));
});

for (const [reglage, valeurs] of [
  ["clair", { theme: "clair", taille: "standard" }],
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands-caracteres", { theme: "clair", taille: "grands" }],
] as const) {
  test(`les captures de l'écran Activités, en ${reglage}`, async ({ page }) => {
    const { resident } = await residentAvecActivites();
    await reglerAffichage(resident.id, valeurs);
    await seConnecter(page, resident.email);
    for (const [nom, onglet] of [
      ["je-participe", ""],
      ["j-organise", "?onglet=j_organise"],
      ["archivees", "?onglet=archivees"],
    ]) {
      await page.goto(`/activites${onglet}`);
      await expect(segments(page)).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath(`activites-${nom}-${reglage}.png`),
        fullPage: true,
      });
    }
  });
}
