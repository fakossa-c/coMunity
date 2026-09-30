import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouvelleAnnonce,
  nouvelleReponseSondage,
  nouveauResident,
  nouveauSondage,
  nouveauSyndic,
  reglerAffichage,
  supprimerAnnonces,
  supprimerComptes,
  verifierSansDefilementHorizontal,
} from "./outils";

// Ticket #39 : le conseil syndical joint un sondage à choix unique à une annonce ; un résident
// validé répond une fois, avant la date limite, puis lit les résultats.

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

/** Une annonce de sondage, avec son sondage, créée par le serveur. */
async function annonceAvecSondage(echeance: string, titre: string) {
  const annonce = await nouvelleAnnonce({ type: "sondage", titre });
  const sondage = await nouveauSondage(annonce.id, { echeance });
  return { annonce, sondage };
}

test("le conseil syndical publie un sondage, un résident répond et lit les résultats", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const titre = titreUnique("Horaires du local vélos");

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/annonces/nouvelle");
  // Le bloc sondage n'apparaît que pour une annonce de type Sondage.
  await expect(page.getByLabel("Question", { exact: true })).toHaveCount(0);
  await page.getByLabel("Type").selectOption("sondage");
  await page.getByLabel("Titre").fill(titre);

  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Posez une question aux résidents.",
  );
  await page
    .getByLabel("Question", { exact: true })
    .fill("Quel créneau vous convient le mieux ?");
  await page.getByLabel("Option 1", { exact: true }).fill("7h à 21h");
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Proposez au moins deux options.",
  );
  await page.getByLabel("Option 2", { exact: true }).fill("6h à 23h");
  await page.getByRole("button", { name: "Ajouter une option" }).click();
  await page.getByLabel("Option 3", { exact: true }).fill("Accès 24h/24");
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choisissez la date limite des réponses.",
  );
  await page
    .getByLabel("Date limite des réponses", { exact: true })
    .fill(jour(7));
  await page.screenshot({
    path: test.info().outputPath("formulaire-sondage.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${titre} » est publiée.`,
  );

  // Le conseil syndical lit déjà les résultats, à zéro, sans avoir répondu.
  await page.goto("/annonces");
  const carteSyndic = carte(page, titre);
  await expect(carteSyndic).toContainText(
    "Quel créneau vous convient le mieux ?",
  );
  await expect(carteSyndic).toContainText("Aucune réponse");
  await expect(carteSyndic.getByRole("listitem").first()).toContainText("0 %");

  // Un résident validé répond une seule fois.
  await page.context().clearCookies();
  await seConnecter(page, resident.email);
  await page.goto("/annonces");
  const annonce = carte(page, titre);
  await expect(annonce).toContainText("Sondage");
  await expect(annonce).toContainText("Quel créneau vous convient le mieux ?");
  await expect(annonce).toContainText("Jusqu'au");
  const envoyer = annonce.getByRole("button", { name: "Envoyer ma réponse" });
  await expect(envoyer).toBeDisabled();
  // Rien ne se lit avant la réponse.
  await expect(annonce).not.toContainText("%");
  const option = annonce.getByRole("radio", { name: "6h à 23h" });
  await option.check();
  await expect(envoyer).toBeEnabled();
  const hauteur = await annonce
    .locator("label")
    .filter({ hasText: "6h à 23h" })
    .evaluate((noeud) => noeud.getBoundingClientRect().height);
  expect(hauteur).toBeGreaterThanOrEqual(56);
  await page.screenshot({
    path: test.info().outputPath("sondage-vote.png"),
    fullPage: true,
  });
  await envoyer.click();

  await expect(annonce.getByRole("status")).toContainText(
    "Merci, votre réponse est enregistrée.",
  );
  await expect(annonce).toContainText("1 réponse");
  await expect(
    annonce.getByRole("listitem").filter({ hasText: "6h à 23h" }),
  ).toContainText("100 %");
  await expect(
    annonce.getByRole("listitem").filter({ hasText: "6h à 23h" }),
  ).toContainText("Votre choix");
  await expect(
    annonce.getByRole("button", { name: "Envoyer ma réponse" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("sondage-resultats.png"),
    fullPage: true,
  });

  // Après rechargement, les résultats restent affichés, avec le choix coché.
  await page.reload();
  const apres = carte(page, titre);
  await expect(apres).toContainText("1 réponse");
  await expect(
    apres.getByRole("listitem").filter({ hasText: "6h à 23h" }),
  ).toContainText("Votre choix");
  await expect(
    apres.getByRole("button", { name: "Envoyer ma réponse" }),
  ).toHaveCount(0);
  await expect(apres.getByRole("radio")).toHaveCount(0);

  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
});

test("un résident en attente voit le sondage sans pouvoir répondre ni lire les résultats", async ({
  page,
}) => {
  const attente = await nouveauResident("en_attente");
  const votant = await nouveauResident("valide");
  emails.push(attente.email, votant.email);
  const titre = titreUnique("Sondage jardin");
  const { sondage } = await annonceAvecSondage(jour(5), titre);
  await nouvelleReponseSondage(sondage.id, votant.id, 1);

  await seConnecter(page, attente.email);
  await page.goto("/annonces");

  const annonce = carte(page, titre);
  await expect(annonce).toContainText("Quel créneau vous convient le mieux ?");
  await expect(annonce).toContainText("7h à 21h");
  await expect(annonce).toContainText("Accès 24h/24");
  await expect(annonce.getByRole("radio")).toHaveCount(0);
  await expect(
    annonce.getByRole("button", { name: "Envoyer ma réponse" }),
  ).toHaveCount(0);
  await expect(annonce).toContainText(
    "Vous pourrez répondre dès que le conseil syndical aura validé votre compte.",
  );
  await expect(annonce).not.toContainText("%");
});

test("après la date limite, tout le monde lit les résultats et personne ne répond", async ({
  page,
}) => {
  const attente = await nouveauResident("en_attente");
  const votant = await nouveauResident("valide");
  const absent = await nouveauResident("valide");
  emails.push(attente.email, votant.email, absent.email);
  const titre = titreUnique("Sondage terminé");
  const { sondage } = await annonceAvecSondage(jour(-1), titre);
  await nouvelleReponseSondage(sondage.id, votant.id, 2);
  await nouvelleReponseSondage(sondage.id, attente.id, 2);

  for (const compte of [absent, attente, votant]) {
    await page.context().clearCookies();
    await seConnecter(page, compte.email);
    await page.goto("/annonces");
    const annonce = carte(page, titre);
    await expect(annonce).toContainText("Sondage terminé le");
    await expect(annonce).toContainText("2 réponses");
    await expect(
      annonce.getByRole("listitem").filter({ hasText: "6h à 23h" }),
    ).toContainText("100 %");
    await expect(annonce.getByRole("radio")).toHaveCount(0);
    await expect(
      annonce.getByRole("button", { name: "Envoyer ma réponse" }),
    ).toHaveCount(0);
  }
  await expect(
    carte(page, titre).getByRole("listitem").filter({ hasText: "6h à 23h" }),
  ).toContainText("Votre choix");
});

test("le sondage reste modifiable seulement à la création : la modification l'affiche sans le rouvrir", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const titre = titreUnique("Sondage figé");
  const { annonce } = await annonceAvecSondage(jour(5), titre);

  await seConnecter(page, syndic.email);
  await page.goto(`/syndic/annonces/${annonce.id}`);

  await expect(page.getByLabel("Type")).toBeDisabled();
  await expect(page.getByRole("main")).toContainText(
    "Quel créneau vous convient le mieux ?",
  );
  await expect(page.getByRole("main")).toContainText(
    "Un sondage publié ne se modifie plus",
  );
  await expect(page.getByLabel("Question", { exact: true })).toHaveCount(0);
});

test("le conseil syndical qui n'a pas encore répondu lit les résultats et peut répondre", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  const votant = await nouveauResident("valide");
  emails.push(syndic.email, votant.email);
  const titre = titreUnique("Sondage du conseil");
  const { sondage } = await annonceAvecSondage(jour(5), titre);
  await nouvelleReponseSondage(sondage.id, votant.id, 3);

  await seConnecter(page, syndic.email);
  await page.goto("/annonces");

  const annonce = carte(page, titre);
  await expect(annonce).toContainText("1 réponse");
  await expect(
    annonce.getByRole("listitem").filter({ hasText: "Accès 24h/24" }),
  ).toContainText("100 %");
  await annonce.getByRole("button", { name: "Répondre au sondage" }).click();
  await annonce.getByRole("radio", { name: "7h à 21h" }).check();
  await annonce.getByRole("button", { name: "Envoyer ma réponse" }).click();
  await expect(annonce).toContainText("2 réponses");
  await expect(
    annonce.getByRole("listitem").filter({ hasText: "7h à 21h" }),
  ).toContainText("Votre choix");
});

test("un résident répond depuis le lien public de l'annonce, un visiteur n'y voit pas le sondage", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  const titre = titreUnique("Sondage partagé");
  const { annonce } = await annonceAvecSondage(jour(5), titre);
  const lien = `/annonces/${annonce.identifiant_public}`;

  await page.goto(lien);
  await expect(
    page.getByRole("heading", { level: 1, name: titre }),
  ).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(
    "Quel créneau vous convient le mieux ?",
  );

  await seConnecter(page, resident.email);
  await page.goto(lien);
  await page.getByRole("radio", { name: "Accès 24h/24" }).check();
  await page.getByRole("button", { name: "Envoyer ma réponse" }).click();

  await expect(
    page.getByText("Merci, votre réponse est enregistrée."),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Accès 24h/24" }),
  ).toContainText("Votre choix");
});

// Ticket #130 (spec #125) : le sondage de la présentation Journal, à voter puis en résultats, dans
// la carte de la liste et sur la fiche, reste dans la page en sombre comme en grands caractères.
for (const [nom, reglages] of [
  ["sombre", { theme: "sombre", taille: "standard" }],
  ["grands caractères", { theme: "clair", taille: "grands" }],
] as const) {
  test(`un sondage à voter puis en résultats ne fait pas défiler la page horizontalement, en ${nom}`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await reglerAffichage(resident.id, reglages);
    const aVoter = titreUnique("Sondage à voter");
    const vote = titreUnique("Sondage voté");
    await annonceAvecSondage(jour(5), aVoter);
    const { sondage } = await annonceAvecSondage(jour(5), vote);
    await nouvelleReponseSondage(sondage.id, resident.id, 2);

    await seConnecter(page, resident.email);
    await page.goto("/annonces");
    await expect(
      carte(page, aVoter).getByRole("radio", { name: "6h à 23h" }),
    ).toBeAttached();
    await expect(carte(page, vote)).toContainText("Votre choix");
    await verifierSansDefilementHorizontal(page);
    await page.screenshot({
      path: test.info().outputPath(`sondages-liste-${reglages.theme}.png`),
      fullPage: true,
    });

    await carte(page, vote).getByRole("link", { name: vote }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: vote }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Votre choix");
    await verifierSansDefilementHorizontal(page);
  });
}
