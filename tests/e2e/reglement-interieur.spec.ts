import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouveauSyndic,
  nouvelleSectionReglement,
  reglerAffichage,
  supprimerComptes,
  supprimerSectionsReglement,
} from "./outils";

// Ticket #43 : le conseil syndical rédige le règlement intérieur, les résidents le lisent dans Ma
// copro en dépliant ses sections.

const emails: string[] = [];
const titres: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
  await supprimerSectionsReglement(titres.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
}

function enregistrer(page: Page) {
  return page.getByRole("button", { name: "Enregistrer", exact: true }).click();
}

/** Les titres des sections de la liste, dans l'ordre où la page les montre. */
function titresDeLaListe(page: Page) {
  return page
    .getByRole("list", { name: "Sections du règlement intérieur" })
    .getByRole("heading")
    .allTextContents();
}

test("le conseil syndical rédige deux sections, un résident les lit en les dépliant", async ({
  page,
  browser,
}) => {
  const syndic = await nouveauSyndic();
  const resident = await nouveauResident("valide");
  emails.push(syndic.email, resident.email);
  const suffixe = randomUUID().slice(0, 6);
  const bruit = `Bruit ${suffixe}`;
  const dechets = `Déchets ${suffixe}`;
  titres.push(bruit, dechets);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/reglement");
  await expect(
    page.getByRole("heading", { level: 1, name: "Règlement intérieur" }),
  ).toBeVisible();

  // Une première section : les erreurs d'abord, puis l'aperçu, puis l'enregistrement.
  await page.getByRole("link", { name: "Ajouter une section" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Ajouter une section" }),
  ).toBeVisible();
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Donnez un titre à la section.",
  );
  await page.getByLabel("Titre", { exact: true }).fill(bruit);
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Écrivez le texte de la section.",
  );
  await page
    .getByLabel("Texte", { exact: true })
    .fill("Pas de bruit après 22h.\n\n- Musique douce\n- **Pas de fête**");
  await page.getByRole("button", { name: "Voir l'aperçu" }).click();
  const apercu = page.getByRole("region", { name: "Aperçu de la section" });
  await expect(apercu.getByRole("heading", { name: bruit })).toBeVisible();
  await expect(apercu.getByRole("listitem")).toHaveText([
    "Musique douce",
    "Pas de fête",
  ]);
  await expect(apercu.locator("strong")).toHaveText("Pas de fête");
  await page.screenshot({
    path: test.info().outputPath("apercu-section.png"),
    fullPage: true,
  });
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${bruit} » est ajoutée au règlement intérieur.`,
  );

  // La seconde, puis la remontée d'un cran : elle passe avant la première.
  await page.getByRole("link", { name: "Ajouter une section" }).click();
  await page.getByLabel("Titre", { exact: true }).fill(dechets);
  await page.getByLabel("Texte", { exact: true }).fill("Triez vos déchets.");
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${dechets} » est ajoutée au règlement intérieur.`,
  );
  let ordre = await titresDeLaListe(page);
  expect(ordre.indexOf(bruit)).toBeLessThan(ordre.indexOf(dechets));
  // Le projet mobile et le projet desktop écrivent dans la même base : la voisine du dessus peut
  // être une section de l'autre, on remonte donc jusqu'à passer avant « bruit ».
  for (let essai = 0; essai < 10; essai++) {
    const place = ordre.indexOf(dechets);
    if (place < ordre.indexOf(bruit)) break;
    // Le clic peut précéder l'hydratation de la page, qui vient de s'ouvrir : on le rejoue.
    await expect(async () => {
      await page
        .getByRole("button", { name: `Monter : ${dechets}` })
        .click({ timeout: 2000 });
      await expect
        .poll(async () => (await titresDeLaListe(page)).indexOf(dechets), {
          timeout: 3000,
        })
        .toBeLessThan(place);
    }).toPass({ timeout: 20_000 });
    ordre = await titresDeLaListe(page);
  }
  expect(ordre.indexOf(dechets)).toBeLessThan(ordre.indexOf(bruit));
  await page.screenshot({
    path: test.info().outputPath("liste-sections.png"),
    fullPage: true,
  });

  // Un résident lit le règlement depuis Ma copro, section par section.
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
      lecteur.getByRole("heading", { level: 1, name: "Ma copro" }),
    ).toBeVisible();
    await expect(lecteur.getByRole("main")).toContainText("Mis à jour le");

    const titreBruit = lecteur.getByRole("button", { name: bruit });
    const titreDechets = lecteur.getByRole("button", { name: dechets });
    // Le texte se lit dans la section qui le porte : l'autre projet écrit les mêmes phrases.
    const texteBruit = lecteur.getByRole("region", { name: bruit });
    const texteDechets = lecteur.getByRole("region", { name: dechets });
    await expect(titreBruit).toHaveAttribute("aria-expanded", "false");
    await expect(titreDechets).toHaveAttribute("aria-expanded", "false");
    await expect(texteBruit).toBeHidden();

    await titreBruit.click();
    await expect(titreBruit).toHaveAttribute("aria-expanded", "true");
    await expect(texteBruit).toContainText("Pas de bruit après 22h.");
    await expect(texteBruit.getByRole("listitem")).toHaveText([
      "Musique douce",
      "Pas de fête",
    ]);
    await expect(texteBruit.locator("strong")).toHaveText("Pas de fête");
    await expect(texteDechets).toBeHidden();
    await titreBruit.click();
    await expect(titreBruit).toHaveAttribute("aria-expanded", "false");

    await lecteur.getByRole("button", { name: "Tout déplier" }).click();
    await expect(titreBruit).toHaveAttribute("aria-expanded", "true");
    await expect(titreDechets).toHaveAttribute("aria-expanded", "true");
    await expect(texteDechets).toContainText("Triez vos déchets.");
    await lecteur.screenshot({
      path: test.info().outputPath("ma-copro.png"),
      fullPage: true,
    });
  } finally {
    await contexte.close();
  }
});

test("le conseil syndical modifie puis supprime une section, après confirmation", async ({
  page,
}) => {
  const syndic = await nouveauSyndic();
  emails.push(syndic.email);
  const section = await nouvelleSectionReglement();
  const nouveauTitre = `${section.titre} (mis à jour)`;
  titres.push(section.titre, nouveauTitre);

  await seConnecter(page, syndic.email);
  await page.goto("/syndic/reglement");
  await page.getByRole("link", { name: `Modifier : ${section.titre}` }).click();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(
    section.titre,
  );
  await page.getByLabel("Titre", { exact: true }).fill(nouveauTitre);
  await enregistrer(page);
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nouveauTitre} » est enregistrée.`,
  );

  await page.getByRole("link", { name: `Modifier : ${nouveauTitre}` }).click();
  await page.getByRole("button", { name: "Supprimer la section" }).click();
  const feuille = page.getByRole("dialog", {
    name: "Supprimer cette section ?",
  });
  await expect(feuille).toContainText("Cette action est définitive.");
  await feuille.getByRole("button", { name: "Garder la section" }).click();
  await expect(feuille).toBeHidden();
  await page.getByRole("button", { name: "Supprimer la section" }).click();
  await feuille.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    `« ${nouveauTitre} » est supprimée.`,
  );
  await expect(
    page.getByRole("link", { name: `Modifier : ${nouveauTitre}` }),
  ).toHaveCount(0);
});

test("un résident n'entre pas dans la rédaction du règlement", async ({
  page,
}) => {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);

  await seConnecter(page, resident.email);
  await page.goto("/syndic/reglement");

  await expect(page.getByRole("main")).toContainText(
    "Cet espace est réservé aux membres du conseil syndical.",
  );
});

test("un résident en attente de validation lit le règlement", async ({
  page,
}) => {
  const resident = await nouveauResident("en_attente");
  emails.push(resident.email);
  const section = await nouvelleSectionReglement();
  titres.push(section.titre);

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");

  const titre = page.getByRole("button", { name: section.titre });
  await titre.click();
  await expect(titre).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: section.titre })).toContainText(
    "Pas de bruit après 22h.",
  );
});

test("un résident refusé ne lit pas le règlement", async ({ page }) => {
  const resident = await nouveauResident("refuse");
  emails.push(resident.email);
  const section = await nouvelleSectionReglement();
  titres.push(section.titre);

  await seConnecter(page, resident.email);
  await page.goto("/ma-copro");

  await expect(page.getByRole("main")).toContainText("Compte non accepté");
  await expect(page.getByRole("main")).not.toContainText(section.titre);
});

test("un visiteur est conduit à la connexion avant de lire le règlement", async ({
  page,
}) => {
  await page.goto("/ma-copro");

  await expect(page).toHaveURL(/\/connexion\?suivant=%2Fma-copro/);
});

for (const theme of ["clair", "sombre"] as const) {
  test(`le règlement déplié est lisible au clavier, en grands caractères et en thème ${theme}`, async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    const section = await nouvelleSectionReglement();
    titres.push(section.titre);
    await reglerAffichage(resident.id, { theme, taille: "grands" });

    await seConnecter(page, resident.email);
    await page.goto("/ma-copro");
    // Le thème clair est l'absence d'attribut, seul le sombre en pose un.
    if (theme === "sombre")
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        "sombre",
      );
    await expect(page.locator("html")).toHaveAttribute("data-taille", "grands");

    // Au clavier : on atteint le titre de la section, Entrée la déplie, Espace la replie.
    const titre = page.getByRole("button", { name: section.titre });
    await titre.focus();
    await page.keyboard.press("Enter");
    await expect(titre).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(titre).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await expect(titre).toHaveAttribute("aria-expanded", "true");

    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      resultat.violations,
      JSON.stringify(resultat.violations, null, 2),
    ).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`ma-copro-${theme}-grands.png`),
      fullPage: true,
    });
  });
}
