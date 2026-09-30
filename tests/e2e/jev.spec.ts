import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { lireSupabaseLocal } from "../../scripts/supabase-local.mjs";
import {
  choisirDate,
  continuerProposer,
  estBureau,
  etapeProposer,
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelleActivite,
  saisirLieuLibre,
  supprimerComptes,
} from "./outils";

// Ticket #20 : Jev présélectionne la catégorie et le pictogramme, signale ce qui manque et met en
// relecture ce qu'il juge non conforme. Un faux OpenRouter (tests/e2e/faux-jev.mjs) répond à sa
// place selon le titre ; aucun appel réel. Sans clé, l'app se comporte comme avant : c'est le cas
// des autres tests de création, dont les titres ne déclenchent aucun cas du faux Jev.

const local = lireSupabaseLocal();
const portJev = Number(
  process.env.PORT_JEV_E2E ?? Number(process.env.PORT_E2E ?? 3100) + 1000,
);
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

async function pageConnectee(browser: Browser, email: string) {
  const contexte = await browser.newContext({ locale: "fr-FR" });
  const page = await contexte.newPage();
  await seConnecter(page, email);
  return page;
}

function dansUnMois() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function continuer(page: Page) {
  return page.getByRole("button", { name: "Continuer" }).click();
}

/** Un titre qui déclenche le cas `cas` du faux Jev, et n'est celui d'aucun autre test. */
function titreDuCas(cas: string) {
  return `Atelier ${cas} ${randomUUID().slice(0, 6)}`;
}

/**
 * Ouvre le parcours d'un nouveau résident, connecté, et remplit l'étape 1 sans toucher à la
 * catégorie. `avantLaSaisie` prépare le compte avant que le titre soit saisi : sur ordinateur,
 * quitter le titre pour le mot d'accueil suffit à appeler Jev, qui présélectionne la catégorie.
 */
async function commencer(
  page: Page,
  titre: string,
  avantLaSaisie?: (resident: { id: string }) => Promise<void>,
) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await avantLaSaisie?.(resident);
  await seConnecter(page, resident.email);
  await page.goto("/proposer");
  await etapeProposer(page, 1);
  await page.getByLabel("Titre de l'activité").fill(titre);
  await page.getByLabel("Mot d'accueil").fill("Venez avec vos idées.");
  return resident;
}

/**
 * Remplit la date, les heures et le lieu libre, puis le reste jusqu'au récapitulatif : sur mobile
 * les étapes 2 et 3, sur ordinateur la page unique, où l'assistant relit en haut de la page.
 */
async function jusquAuRecapitulatif(page: Page) {
  await etapeProposer(page, 2);
  await choisirDate(page, dansUnMois());
  await page.getByLabel("Heure de début").selectOption("10:00");
  await page.getByLabel("Heure de fin").selectOption("11:30");
  await saisirLieuLibre(page, "Chez Danielle, 2e étage");
  await continuerProposer(page);
  await etapeProposer(page, 3);
  await continuerProposer(page);
  await etapeProposer(page, 4);
}

/** Ce que le faux Jev a reçu pour ce titre. */
async function recuParJev(titre: string) {
  const reponse = await fetch(`http://127.0.0.1:${portJev}/requetes`);
  const recues: Record<string, string>[] = await reponse.json();
  return recues.filter((r) => r.titre === titre);
}

/** Le client de la clé secrète : il voit aussi l'activité en relecture. */
function clientAdmin() {
  return createClient(local.url, local.cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function activitePubliee(titre: string) {
  const { data, error } = await clientAdmin()
    .from("activite")
    .select("identifiant_public, categorie, pictogramme, statut")
    .eq("titre", titre)
    .single();
  if (error) throw error;
  return data;
}

test("Jev présélectionne la catégorie et le pictogramme, le créateur les change, et seul le nécessaire part", async ({
  page,
}) => {
  const titre = titreDuCas("Bricolage");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);

  // Sur mobile, de retour à l'étape 1 ; sur ordinateur, la page unique la montre déjà : la
  // catégorie et le pictogramme sont ceux de Jev, dits comme tels.
  if (!estBureau(page)) {
    await page
      .getByRole("button", { name: "Modifier : Titre, catégorie et photos" })
      .click();
    await etapeProposer(page, 1);
  }
  const principal = page.getByRole("main");
  await expect(page.getByLabel("Catégorie")).toHaveValue("creation_bricolage");
  await expect(principal).toContainText(
    "Suggérée d'après votre titre. Changez-la si elle ne convient pas.",
  );
  await expect(principal).toContainText(
    "Pictogramme suggéré d'après votre titre.",
  );
  await page.screenshot({
    path: test.info().outputPath("etape-1-suggestions.png"),
    fullPage: true,
  });

  // Le créateur reprend la main : le pictogramme de la catégorie, puis une autre catégorie.
  await page
    .getByRole("button", { name: "Garder celui de la catégorie" })
    .click();
  await expect(principal).not.toContainText("Pictogramme suggéré");
  await page
    .getByLabel("Catégorie")
    .selectOption({ label: "Jardin et nature" });
  await expect(principal).not.toContainText("Suggérée d'après votre titre");
  await continuerProposer(page);
  await etapeProposer(page, 4);
  await expect(principal).toContainText("Jardin et nature");
  await page.getByRole("button", { name: /^Publier/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  const publiee = await activitePubliee(titre);
  expect(publiee).toMatchObject({
    categorie: "jardin_nature",
    pictogramme: "potted_plant",
    statut: "publiee",
  });

  // Jev n'a reçu que le titre, la description et le créneau : rien du lieu, des places, du compte.
  const recues = await recuParJev(titre);
  expect(recues.length).toBeGreaterThan(0);
  for (const recue of recues) {
    expect(Object.keys(recue).sort()).toEqual([
      "date",
      "description",
      "heureDebut",
      "heureFin",
      "titre",
    ]);
    expect(JSON.stringify(recue)).not.toContain("Danielle");
  }
});

test("le pictogramme suggéré par Jev est celui de l'activité publiée, et se voit au récapitulatif", async ({
  page,
}) => {
  const titre = titreDuCas("Bricolage");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText("Création et bricolage");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  expect(await activitePubliee(titre)).toMatchObject({
    categorie: "creation_bricolage",
    pictogramme: "kitchen",
    statut: "publiee",
  });
});

test("une suggestion incertaine ne change rien", async ({ page }) => {
  const titre = titreDuCas("Incertain");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText("Moments partagés");
  await expect(page.getByRole("main")).not.toContainText("relue");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  expect(await activitePubliee(titre)).toMatchObject({
    categorie: "moments_partages",
    pictogramme: "waving_hand",
    statut: "publiee",
  });
});

test("la catégorie choisie par le créateur n'est pas remplacée", async ({
  page,
}) => {
  const titre = titreDuCas("Bricolage");
  await commencer(page, titre);
  await page
    .getByLabel("Catégorie")
    .selectOption({ label: "Jardin et nature" });
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText("Jardin et nature");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  expect((await activitePubliee(titre)).categorie).toBe("jardin_nature");
});

test("Jev signale une information qui semble manquer, sans empêcher de publier", async ({
  page,
}) => {
  const titre = titreDuCas("Sans détail");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText(
    "Précisez ce que chacun doit apporter, ou ce que vous fournissez.",
  );
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();
});

test("une proposition jugée non conforme est mise en relecture, avec la raison pour le conseil syndical", async ({
  page,
  browser,
}) => {
  const titre = titreDuCas("Bruyante");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText(
    "Votre activité sera relue par le conseil syndical avant d'être visible de vos voisins.",
  );
  await page.getByRole("button", { name: "Publier" }).click();

  // Pas d'écran de partage : l'activité n'est pas publique. Le créateur arrive sur sa fiche.
  await expect(page).toHaveURL(/\/activites\/[^/]+$/);
  await expect(page.getByRole("main")).toContainText("En relecture");
  await page.screenshot({
    path: test.info().outputPath("fiche-en-relecture.png"),
    fullPage: true,
  });
  expect((await activitePubliee(titre)).statut).toBe("en_relecture");

  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const pageSyndic = await pageConnectee(browser, syndic.email);
  await pageSyndic.goto("/syndic/moderation");
  const ligne = pageSyndic.getByRole("listitem").filter({ hasText: titre });
  await expect(ligne).toContainText("En relecture");
  await expect(ligne).toContainText(
    "Raison : Nuisances sonores : l'activité risque de gêner le voisinage.",
  );
  await pageSyndic.context().close();
});

test("un Jev en panne ne bloque ni le parcours ni la publication", async ({
  page,
}) => {
  const titre = titreDuCas("Panne");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText("Rien à signaler");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  expect((await activitePubliee(titre)).statut).toBe("publiee");
});

test("un Jev trop lent ne bloque ni le parcours ni la publication", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const titre = titreDuCas("Lent");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText("Rien à signaler", {
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible({ timeout: 15_000 });

  expect((await activitePubliee(titre)).statut).toBe("publiee");
});

/** L'état d'une activité en base, lu avec la clé secrète. */
async function statutDe(titre: string) {
  const { data } = await clientAdmin()
    .from("activite")
    .select("statut")
    .eq("titre", titre)
    .maybeSingle();
  return data?.statut as string | undefined;
}

// Ticket #101 : rien n'est public avant l'avis de Jev, à la création comme à la modification.

test("pendant l'appel à Jev, l'activité n'est publique pour personne", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // « Lent » : le faux Jev met 8 s à répondre, l'assistant renonce au bout de 3 s.
  const titre = titreDuCas("Lent");
  await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText("Rien à signaler", {
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Publier" }).click();
  // Dès l'insertion et tant que Jev est écouté, l'activité attend en relecture.
  await expect
    .poll(() => statutDe(titre), { intervals: [100], timeout: 10_000 })
    .toBe("en_relecture");
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible({ timeout: 15_000 });
  expect(await statutDe(titre)).toBe("publiee");
});

async function modifierLeTitre(page: Page, identifiant: string, titre: string) {
  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("link", { name: "Modifier" }).click();
  await page.getByLabel("Titre de l'activité").fill(titre);
  await continuer(page);
  await continuer(page);
  await continuer(page);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));
}

async function createurAvecActivitePubliee(page: Page) {
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const identifiant = await nouvelleActivite(createur.id);
  await seConnecter(page, createur.email);
  return identifiant;
}

test("une modification que Jev juge non conforme repasse en relecture, avec la raison pour le conseil syndical", async ({
  page,
  browser,
}) => {
  const identifiant = await createurAvecActivitePubliee(page);
  const titre = titreDuCas("Bruyante");

  await modifierLeTitre(page, identifiant, titre);

  await expect(page.getByRole("main")).toContainText("En relecture");
  expect(await statutDe(titre)).toBe("en_relecture");

  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const pageSyndic = await pageConnectee(browser, syndic.email);
  await pageSyndic.goto("/syndic/moderation");
  const ligne = pageSyndic.getByRole("listitem").filter({ hasText: titre });
  await expect(ligne).toContainText(
    "Raison : Nuisances sonores : l'activité risque de gêner le voisinage.",
  );
  await pageSyndic.context().close();
});

test("une modification conforme reste publiée, et Jev en a relu le nouveau texte", async ({
  page,
}) => {
  const identifiant = await createurAvecActivitePubliee(page);
  const titre = titreDuCas("Bricolage");

  await modifierLeTitre(page, identifiant, titre);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(titre);
  expect(await statutDe(titre)).toBe("publiee");
  expect((await recuParJev(titre)).length).toBeGreaterThan(0);
});

test("une modification quand Jev est en panne reste publiée : Jev ne bloque jamais", async ({
  page,
}) => {
  const identifiant = await createurAvecActivitePubliee(page);
  const titre = titreDuCas("Panne");

  await modifierLeTitre(page, identifiant, titre);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(titre);
  expect(await statutDe(titre)).toBe("publiee");
});

// Ticket #100 : chaque appel à Jev est réservé auprès de la base (10 par heure en création, 10 par
// heure en modification, 30 par jour). Plafond atteint, le parcours se passe de Jev comme d'un Jev
// en panne : rien n'est bloqué ni perdu, et l'activité est publiée sans avis.

/** Des appels que le compte vient de faire : autant que le budget horaire de `action` en accorde. */
async function epuiserLeBudget(
  compte: string,
  action: "creation" | "modification",
) {
  const { error } = await clientAdmin()
    .from("appel_jev")
    .insert(Array.from({ length: 10 }, () => ({ compte_id: compte, action })));
  if (error) throw error;
}

async function appelsReserves(compte: string) {
  const { data, error } = await clientAdmin()
    .from("appel_jev")
    .select("action")
    .eq("compte_id", compte);
  if (error) throw error;
  return data.map((ligne) => ligne.action as string);
}

test("un parcours de création réserve ses appels à Jev sur le budget de création", async ({
  page,
}) => {
  const titre = titreDuCas("Bricolage");
  const resident = await commencer(page, titre);
  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  const appels = await appelsReserves(resident.id);
  expect(appels.length).toBeGreaterThanOrEqual(2);
  expect(new Set(appels)).toEqual(new Set(["creation"]));
  expect((await recuParJev(titre)).length).toBe(appels.length);
});

test("plafond de création atteint : Jev n'est pas appelé, le parcours va au bout et l'activité est publiée", async ({
  page,
}) => {
  // « Bruyante » : Jev, s'il était écouté, mettrait l'activité en relecture.
  const titre = titreDuCas("Bruyante");
  const resident = await commencer(page, titre, (nouveau) =>
    epuiserLeBudget(nouveau.id, "creation"),
  );

  await continuerProposer(page);
  await jusquAuRecapitulatif(page);
  await expect(page.getByRole("main")).toContainText("Rien à signaler");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();

  expect(await recuParJev(titre)).toEqual([]);
  expect(await statutDe(titre)).toBe("publiee");
  expect(await appelsReserves(resident.id)).toHaveLength(10);
});

test("une modification réserve un appel sur le budget de modification", async ({
  page,
}) => {
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const identifiant = await nouvelleActivite(createur.id);
  await seConnecter(page, createur.email);
  const titre = titreDuCas("Bricolage");

  await modifierLeTitre(page, identifiant, titre);

  expect(await appelsReserves(createur.id)).toEqual(["modification"]);
});

test("plafond de modification atteint : Jev n'est pas appelé, la modification est enregistrée et publiée", async ({
  page,
}) => {
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const identifiant = await nouvelleActivite(createur.id);
  await epuiserLeBudget(createur.id, "modification");
  await seConnecter(page, createur.email);
  const titre = titreDuCas("Bruyante");

  await modifierLeTitre(page, identifiant, titre);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(titre);
  expect(await statutDe(titre)).toBe("publiee");
  expect(await recuParJev(titre)).toEqual([]);
});

test("le plafond de création ne prive pas de Jev une modification", async ({
  page,
}) => {
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const identifiant = await nouvelleActivite(createur.id);
  await epuiserLeBudget(createur.id, "creation");
  await seConnecter(page, createur.email);
  const titre = titreDuCas("Bruyante");

  await modifierLeTitre(page, identifiant, titre);

  await expect(page.getByRole("main")).toContainText("En relecture");
  expect(await statutDe(titre)).toBe("en_relecture");
});

test("modifier la capacité seule consomme aussi un appel de modification", async ({
  page,
}) => {
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const identifiant = await nouvelleActivite(createur.id, {
    capacite_max: "10",
  });
  await seConnecter(page, createur.email);

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("link", { name: "Modifier" }).click();
  await continuer(page);
  await continuer(page);
  await page.getByLabel("Nombre de places").fill("12");
  await continuer(page);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));

  expect(await appelsReserves(createur.id)).toEqual(["modification"]);
});
