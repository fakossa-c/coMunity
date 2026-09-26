import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  annulerActivite,
  inscrireResident,
  nouveauResident,
  nouvelleActivite,
  supprimerComptes,
} from "./outils";

// Ticket #12 : le créateur modifie, duplique, supprime ou annule son activité.

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

/** Un créateur connecté, et une activité à venir qu'il a publiée. */
async function createurAvecActivite(
  page: Page,
  activite: Partial<Record<string, string>> = {},
) {
  const createur = await nouveauResident("valide");
  emails.push(createur.email);
  const identifiant = await nouvelleActivite(createur.id, activite);
  await seConnecter(page, createur.email);
  return { createur, identifiant };
}

function continuer(page: Page) {
  return page.getByRole("button", { name: "Continuer" }).click();
}

function il(jours: number) {
  return new Date(Date.now() + jours * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

test("le créateur modifie son activité dans le parcours pré-rempli", async ({
  page,
}) => {
  const { identifiant } = await createurAvecActivite(page);

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("link", { name: "Modifier" }).click();

  await expect(page.getByLabel("Titre de l'activité")).toHaveValue(
    "Goûter crêpes",
  );
  await page.getByLabel("Titre de l'activité").fill("Goûter crêpes et jeux");
  await continuer(page);
  await expect(page.getByLabel("Lieu")).toHaveValue("Jardin partagé");
  await continuer(page);
  await continuer(page);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page).toHaveURL(new RegExp(`/activites/${identifiant}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Goûter crêpes et jeux",
  );
});

test("la capacité ne peut pas descendre sous les personnes déjà inscrites", async ({
  page,
}) => {
  const { identifiant } = await createurAvecActivite(page, {
    capacite_max: "10",
  });
  const voisin = await nouveauResident("valide");
  emails.push(voisin.email);
  await inscrireResident(identifiant, voisin.id, 2);

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("link", { name: "Modifier" }).click();
  await continuer(page);
  await continuer(page);
  await page.getByLabel("Nombre de places").fill("2");
  await continuer(page);

  await expect(
    page.getByText("Indiquez au moins 3 places : elles sont déjà prises."),
  ).toBeVisible();
  await expect(page.getByText("Étape 3 sur 4")).toBeVisible();
});

test("dupliquer recopie tout sauf la date, même depuis une activité passée", async ({
  page,
}) => {
  const { identifiant } = await createurAvecActivite(page, {
    date_activite: il(-30),
    capacite_max: "12",
  });

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("link", { name: "Dupliquer" }).click();

  await expect(page.getByLabel("Titre de l'activité")).toHaveValue(
    "Goûter crêpes",
  );
  await continuer(page);
  await expect(page.getByLabel("Date")).toHaveValue("");
  await expect(page.getByLabel("Heure de début")).toHaveValue("16:00");
  await page.getByLabel("Date").fill(il(20));
  await continuer(page);
  await expect(page.getByLabel("Nombre de places")).toHaveValue("12");
  await continuer(page);
  await page.getByRole("button", { name: "Publier" }).click();

  await expect(page).toHaveURL(/\/activites\/[^/]+\/publiee$/);
  expect(page.url()).not.toContain(identifiant);
});

test("supprimer une activité sans inscrit la supprime, après confirmation", async ({
  page,
}) => {
  const { identifiant } = await createurAvecActivite(page);

  await page.goto(`/activites/${identifiant}`);
  await page.getByRole("button", { name: "Supprimer" }).click();
  const feuille = page.getByRole("dialog");
  await expect(feuille).toContainText("Cette action est définitive.");
  await feuille.getByRole("button", { name: "Supprimer" }).click();

  await expect(page).toHaveURL(/\/activites\?onglet=j_organise/);
  const reponse = await page.goto(`/activites/${identifiant}`);
  expect(reponse?.status()).toBe(404);
});

test("avec des inscrits, l'activité s'annule au lieu de se supprimer, et le dit partout", async ({
  page,
}) => {
  const { identifiant } = await createurAvecActivite(page);
  const voisin = await nouveauResident("valide");
  emails.push(voisin.email);
  await inscrireResident(identifiant, voisin.id);

  await page.goto(`/activites/${identifiant}`);
  await expect(
    page.getByRole("button", { name: "Supprimer", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Annuler l'activité" }).click();
  const feuille = page.getByRole("dialog");
  await expect(feuille).toContainText("Les inscrits verront");
  await feuille.getByRole("button", { name: "Annuler l'activité" }).click();

  await expect(page.getByRole("main").getByText("Annulée")).toBeVisible();
  await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);

  await page.goto("/activites?onglet=j_organise");
  await expect(
    page.getByRole("article").filter({ hasText: "Goûter crêpes" }),
  ).toContainText("Annulée");
});

test("un inscrit voit l'annulation sur sa carte et sur la fiche, sans pouvoir s'y réinscrire", async ({
  page,
}) => {
  const createur = await nouveauResident("valide");
  const inscrit = await nouveauResident("valide");
  emails.push(createur.email, inscrit.email);
  const identifiant = await nouvelleActivite(createur.id);
  await inscrireResident(identifiant, inscrit.id);
  await annulerActivite(identifiant);
  await seConnecter(page, inscrit.email);

  await page.goto("/activites");
  const carte = page.getByRole("article").filter({ hasText: "Goûter crêpes" });
  await expect(carte).toContainText("Annulée");
  await expect(carte).not.toContainText("J'y vais");

  await page.goto(`/activites/${identifiant}`);
  await expect(page.getByRole("main").getByText("Annulée")).toBeVisible();
  await expect(page.getByRole("button", { name: "Je participe" })).toHaveCount(
    0,
  );
});

test("la fiche dit « confirmée » ou combien de participants manquent", async ({
  page,
}) => {
  const { createur, identifiant: manque } = await createurAvecActivite(page, {
    capacite_min: "3",
  });
  const atteint = await nouvelleActivite(createur.id, {
    titre: "Atelier tricot",
    capacite_min: "2",
  });
  const voisin = await nouveauResident("valide");
  emails.push(voisin.email);
  await inscrireResident(manque, voisin.id);
  await inscrireResident(atteint, voisin.id, 1);

  await page.goto(`/activites/${manque}`);
  await expect(
    page.getByText("Encore 2 participants pour confirmer"),
  ).toBeVisible();

  await page.goto(`/activites/${atteint}`);
  await expect(page.getByRole("main").getByText("Confirmée")).toBeVisible();
});

test("J'organise liste mes activités à venir, annulées comprises, puis les passées", async ({
  page,
}) => {
  const { createur } = await createurAvecActivite(page, {
    titre: "Goûter à venir",
  });
  const annulee = await nouvelleActivite(createur.id, { titre: "Loto annulé" });
  await annulerActivite(annulee);
  await nouvelleActivite(createur.id, {
    titre: "Vide-grenier passé",
    date_activite: il(-15),
    capacite_min: "3",
  });

  await page.goto("/activites?onglet=j_organise");
  await expect(page.getByText("Goûter à venir")).toBeVisible();
  await expect(
    page.getByRole("article").filter({ hasText: "Loto annulé" }),
  ).toContainText("Annulée");
  await expect(page.getByText("Vide-grenier passé")).toHaveCount(0);

  await page.getByRole("link", { name: "Passées" }).click();
  await expect(page.getByText("Vide-grenier passé")).toBeVisible();
  // Le minimum n'a plus rien à confirmer une fois l'activité passée.
  await expect(page.getByRole("main")).not.toContainText("pour confirmer");
  await expect(page.getByText("Goûter à venir")).toHaveCount(0);
});

test("le créateur garde « Je participe » sur sa propre fiche, avec ses outils de gestion en plus", async ({
  page,
}) => {
  const { identifiant } = await createurAvecActivite(page);

  await page.goto(`/activites/${identifiant}`);

  await expect(
    page.getByRole("button", { name: "Je participe" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Modifier" })).toBeVisible();
});

test("un autre résident n'a aucun outil de gestion et ne peut pas ouvrir la modification", async ({
  page,
}) => {
  const createur = await nouveauResident("valide");
  const intrus = await nouveauResident("valide");
  emails.push(createur.email, intrus.email);
  const identifiant = await nouvelleActivite(createur.id);
  await seConnecter(page, intrus.email);

  await page.goto(`/activites/${identifiant}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Dupliquer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Supprimer" })).toHaveCount(0);

  const reponse = await page.goto(`/activites/${identifiant}/modifier`);
  expect(reponse?.status()).toBe(404);
});
