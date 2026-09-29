import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  inscrireResident,
  interetsDe,
  modifierProfil,
  nouveauResident,
  nouvelleActivite,
  photoJpeg,
  photosDeProfil,
  supprimerComptes,
  titreAccueil,
} from "./outils";

// Ticket #18 : Mes informations (pseudo, photo, téléphone, bâtiment, étage, visibilité) et Mes
// intérêts. Le pseudo est le seul nom que les voisins voient.

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

async function resident() {
  const compte = await nouveauResident("valide");
  emails.push(compte.email);
  return compte;
}

/** L'encart de Mes informations : la phrase qui dit ce que voient les voisins. */
function synthese(page: Page) {
  return page.getByRole("main").locator("[aria-live=polite]");
}

/** Attend que le serveur ait reçu le réglage enregistré en arrière-plan (POST sur la page). */
function reglageEnregistre(page: Page) {
  return page.waitForResponse(
    (reponse) =>
      reponse.url() === page.url() && reponse.request().method() === "POST",
  );
}

async function auditer(page: Page) {
  const resultat = await new AxeBuilder({ page }).include("main").analyze();
  const critiques = resultat.violations.filter((v) => v.impact === "critical");
  expect(critiques, JSON.stringify(critiques, null, 2)).toEqual([]);
}

test("le Profil mène à Mes informations et à Mes intérêts", async ({
  page,
}) => {
  await seConnecter(page, (await resident()).email);
  await page.goto("/profil");

  await expect(
    page.getByRole("navigation", { name: "Rubriques du profil" }),
  ).toContainText("Mes identifiants");
  await page.getByRole("link", { name: /Mes informations/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Mes informations" }),
  ).toBeVisible();

  await page.goto("/profil");
  await page.getByRole("link", { name: /Mes intérêts/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Mes intérêts" }),
  ).toBeVisible();
});

test("par défaut, les voisins ne voient que le pseudo ; chaque visibilité se règle, la phrase suit tout de suite et le choix persiste", async ({
  page,
}) => {
  const compte = await resident();
  await modifierProfil(compte.id, {
    telephone: "06 12 34 56 78",
    batiment: "Bât. B",
    etage: 2,
  });
  await seConnecter(page, compte.email);
  await page.goto("/profil/informations");

  await expect(synthese(page)).toContainText(
    "Les voisins voient votre pseudo.",
  );
  // Le pseudo est verrouillé visible : un cadenas, pas de bouton. Le prénom et le nom réels n'ont
  // aucun réglage de visibilité, et la page dit à quoi ils servent.
  const carte = page.getByRole("list", { name: "Ce que voient vos voisins" });
  await expect(carte).toContainText("Danielle M.");
  await expect(carte.getByRole("button", { name: /Pseudo/ })).toHaveCount(0);
  await expect(carte).toContainText("Pseudo");
  await expect(carte).toContainText("Visible");
  const reserve = page.getByRole("list", { name: "Prénom et nom" });
  await expect(reserve).toContainText("Danielle");
  await expect(reserve).toContainText("Martin");
  await expect(reserve.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(
    "ne servent qu'au conseil syndical",
  );
  await expect(page.getByRole("main")).toContainText(
    "Le conseil syndical voit toutes vos informations.",
  );
  for (const nom of ["Téléphone", "Bâtiment", "Étage"]) {
    const bouton = carte.getByRole("button", { name: new RegExp(nom) });
    await expect(bouton).toContainText("Masqué");
  }
  await page.screenshot({
    path: test.info().outputPath("mes-informations-defaut.png"),
    fullPage: true,
  });

  // Chaque bascule met la phrase à jour aussitôt, avant même la réponse du serveur.
  let enregistre = reglageEnregistre(page);
  await carte.getByRole("button", { name: /Téléphone/ }).click();
  await expect(synthese(page)).toContainText(
    "Les voisins voient votre pseudo et téléphone.",
  );
  await enregistre;
  enregistre = reglageEnregistre(page);
  await carte.getByRole("button", { name: /Bâtiment/ }).click();
  await enregistre;
  enregistre = reglageEnregistre(page);
  await carte.getByRole("button", { name: /Étage/ }).click();
  await expect(synthese(page)).toContainText(
    "Les voisins voient votre pseudo, téléphone, bâtiment et étage.",
  );
  await enregistre;
  await page.screenshot({
    path: test.info().outputPath("mes-informations-visibles.png"),
    fullPage: true,
  });

  await page.reload();
  await expect(synthese(page)).toContainText(
    "Les voisins voient votre pseudo, téléphone, bâtiment et étage.",
  );
  await expect(carte.getByRole("button", { name: /Téléphone/ })).toContainText(
    "Visible",
  );

  enregistre = reglageEnregistre(page);
  await carte.getByRole("button", { name: /Téléphone/ }).click();
  await expect(synthese(page)).toContainText(
    "Les voisins voient votre pseudo, bâtiment et étage.",
  );
  await enregistre;
  await auditer(page);
});

test("une information visible mais non renseignée n'est pas promise aux voisins", async ({
  page,
}) => {
  await seConnecter(page, (await resident()).email);
  await page.goto("/profil/informations");
  const carte = page.getByRole("list", { name: "Ce que voient vos voisins" });

  const enregistre = reglageEnregistre(page);
  await carte.getByRole("button", { name: /Téléphone/ }).click();
  await enregistre;

  await expect(carte).toContainText("Non renseigné");
  await expect(synthese(page)).toContainText(
    "Les voisins voient votre pseudo.",
  );
});

test("« Annuler » ne modifie rien ; « Enregistrer » change le pseudo et l'adresse partout", async ({
  page,
}) => {
  const compte = await resident();
  const identifiant = await nouvelleActivite(compte.id);
  await seConnecter(page, compte.email);
  await page.goto("/profil/informations");
  await page.getByRole("link", { name: "Modifier mes informations" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Modifier mes informations" }),
  ).toBeVisible();
  // Champs du design system : nom accessible, saisie assistée, listes pour l'adresse.
  await expect(page.getByLabel("Pseudo")).toHaveValue("Danielle M.");
  await expect(page.getByLabel("Pseudo")).toHaveAttribute(
    "autocomplete",
    "nickname",
  );
  await expect(page.getByLabel("Téléphone")).toHaveAttribute(
    "autocomplete",
    "tel",
  );
  await expect(page.getByLabel("Téléphone")).toHaveAttribute("type", "tel");
  await expect(page.getByLabel("Bâtiment")).toHaveJSProperty(
    "tagName",
    "SELECT",
  );
  await expect(page.getByLabel("Étage")).toHaveJSProperty("tagName", "SELECT");
  await expect(page.getByLabel("Prénom")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Enregistrer" })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("modifier-mes-informations.png"),
    fullPage: true,
  });
  await auditer(page);

  // Annuler : rien n'est enregistré.
  await page.getByLabel("Pseudo").fill("Autre pseudo");
  await page.getByRole("link", { name: "Annuler" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Mes informations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Ce que voient vos voisins" }),
  ).toContainText("Danielle M.");

  // Des erreurs claires, sous le champ.
  await page.goto("/profil/informations/modifier");
  await page.getByLabel("Pseudo").fill("   ");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choisissez votre pseudo.",
  );
  await page.getByLabel("Pseudo").fill("Dany");
  await page.getByLabel("Téléphone").fill("06");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Saisissez un numéro de téléphone valide",
  );

  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Bâtiment").selectOption("Bât. B");
  await page.getByLabel("Étage").selectOption({ label: "2e étage" });
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page).toHaveURL(/\/profil\/informations\?fait=enregistre$/);
  await expect(page.getByRole("status")).toContainText(
    "Vos informations sont enregistrées.",
  );
  const carte = page.getByRole("list", { name: "Ce que voient vos voisins" });
  await expect(carte).toContainText("Dany");
  await expect(carte).toContainText("06 12 34 56 78");
  await expect(carte).toContainText("Bât. B");
  await expect(carte).toContainText("2e étage");
  // Enregistrer des informations ne les rend pas visibles pour autant.
  await expect(synthese(page)).toContainText(
    "Les voisins voient votre pseudo.",
  );

  // Le pseudo est le nom de la personne partout : Profil, menu, fiche de son activité.
  await page.goto("/profil");
  await expect(
    page.getByRole("heading", { level: 1, name: "Dany" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Bât. B, 2e étage");
  await page.goto(`/activites/${identifiant}`);
  await expect(page.getByRole("main")).toContainText("Dany");
  await expect(page.getByRole("main")).not.toContainText("Danielle");
  await expect(page.getByRole("main")).not.toContainText("Martin");
});

test("la fiche d'une activité et ses participants nomment les voisins par leur pseudo, jamais par leur nom", async ({
  page,
}) => {
  const organisateur = await resident();
  const inscrit = await resident();
  await modifierProfil(organisateur.id, { pseudo: "Coco" });
  await modifierProfil(inscrit.id, { pseudo: "Voisine du 3" });
  const identifiant = await nouvelleActivite(organisateur.id);
  await inscrireResident(identifiant, inscrit.id);
  const spectateur = await resident();

  await seConnecter(page, spectateur.email);
  await page.goto(`/activites/${identifiant}`);

  await expect(page.getByRole("main")).toContainText("Coco");
  await expect(page.getByRole("list", { name: "Participants" })).toContainText(
    "Voisine du 3",
  );
  await expect(page.getByRole("main")).not.toContainText("Martin");
  await expect(page.getByRole("main")).not.toContainText("Danielle");
});

test("la photo se choisit, se remplace puis se retire ; à défaut, l'initiale du pseudo", async ({
  page,
}) => {
  const compte = await resident();
  await seConnecter(page, compte.email);
  await page.goto("/profil/informations");
  const avatar = page.getByRole("main").locator("img");
  await expect(avatar).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText("D");

  await page.goto("/profil/informations/modifier");
  // Une grande photo : compressée dans le navigateur avant d'être envoyée.
  await page.getByLabel("Ajouter une photo").setInputFiles({
    name: "portrait.jpg",
    mimeType: "image/jpeg",
    buffer: await photoJpeg("#8f2b00", 3000, 2000),
  });
  await expect(page.getByRole("status").first()).toContainText("Une photo");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/fait=enregistre/);

  await expect(avatar).toHaveCount(1);
  await expect
    .poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(1280);
  const premiere = await photosDeProfil(compte.id);
  expect(premiere).toHaveLength(1);
  await page.screenshot({
    path: test.info().outputPath("mes-informations-photo.png"),
    fullPage: true,
  });

  // Remplacer : le fichier précédent quitte le bucket.
  await page.goto("/profil/informations/modifier");
  await expect(page.getByLabel("Remplacer la photo")).toBeVisible();
  await page.getByLabel("Remplacer la photo").setInputFiles({
    name: "autre.jpg",
    mimeType: "image/jpeg",
    buffer: await photoJpeg("#0d3b66", 800, 600),
  });
  await expect(page.getByRole("status").first()).toContainText("Une photo");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/fait=enregistre/);
  const seconde = await photosDeProfil(compte.id);
  expect(seconde).toHaveLength(1);
  expect(seconde[0]).not.toBe(premiere[0]);

  // Retirer : l'initiale du pseudo revient, le bucket est vidé.
  await page.goto("/profil/informations/modifier");
  await page.getByRole("button", { name: "Retirer la photo" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Aucune photo pour l'instant.",
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/fait=enregistre/);
  await expect(avatar).toHaveCount(0);
  expect(await photosDeProfil(compte.id)).toEqual([]);
});

test("Mes intérêts : ajouter, modifier et supprimer", async ({ page }) => {
  const compte = await resident();
  await seConnecter(page, compte.email);
  await page.goto("/profil/interets");
  const liste = page.getByRole("list", { name: "Vos centres d'intérêt" });
  await expect(page.getByRole("main")).toContainText(
    "Vous n'avez encore déclaré aucun centre d'intérêt.",
  );

  const champ = page.getByLabel("Nouveau centre d'intérêt");
  await champ.fill("Jardinage");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(liste).toContainText("Jardinage");
  await expect(champ).toHaveValue("");
  await champ.fill("Jeux de société");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(liste).toContainText("Jeux de société");
  expect(await interetsDe(compte.id)).toEqual(["Jardinage", "Jeux de société"]);
  await page.screenshot({
    path: test.info().outputPath("mes-interets.png"),
    fullPage: true,
  });

  // Un doublon est refusé, sous le champ.
  await champ.fill("jardinage");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Vous avez déjà déclaré ce centre d'intérêt.",
  );
  await champ.fill("");

  await page.getByRole("button", { name: "Modifier Jardinage" }).click();
  await page.getByLabel("Centre d'intérêt", { exact: true }).fill("Potager");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(liste).toContainText("Potager");
  await expect(liste).not.toContainText("Jardinage");

  await page.getByRole("button", { name: "Supprimer Jeux de société" }).click();
  await expect(liste).not.toContainText("Jeux de société");
  expect(await interetsDe(compte.id)).toEqual(["Potager"]);

  await page.reload();
  await expect(liste).toContainText("Potager");
  await auditer(page);
});
