import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  debutDeSemaine,
  finDeSemaine,
  jourDecale,
  libelleJour,
  libelleMois,
  moisDe,
} from "../../src/lib/calendrier";
import { aujourdhui } from "../../src/lib/partage-activite";
import {
  choisirDate,
  MOT_DE_PASSE,
  nouveauResident,
  supprimerComptes,
} from "./outils";

// Ticket #113 : le calendrier tactile de l'étape « Date et lieu » de Proposer.

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

function il(jours: number) {
  return jourDecale(aujourdhui(), jours);
}

/** Un résident connecté, sur l'étape « Date et lieu » de Proposer. */
async function surLEtapeDateEtLieu(page: Page) {
  const resident = await nouveauResident("valide");
  emails.push(resident.email);
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(resident.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/connexion/);
  await page.goto("/proposer");
  await page.getByLabel("Titre de l'activité").fill("Atelier compost");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("main")).toContainText("Étape 2 sur 4");
  return page.getByRole("group", { name: "Date", exact: true });
}

function jour(calendrier: ReturnType<Page["getByRole"]>, date: string) {
  return calendrier.getByRole("button", { name: libelleJour(date) });
}

test("le calendrier se parcourt au clavier et annonce le jour choisi", async ({
  page,
}) => {
  const calendrier = await surLEtapeDateEtLieu(page);
  const depart = il(30);
  await choisirDate(page, depart);
  await expect(jour(calendrier, depart)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(calendrier.getByRole("status")).toHaveText(
    `${libelleJour(depart)} sélectionné`,
  );

  // Un seul jour dans l'ordre de tabulation : celui qui a le focus.
  await expect(
    calendrier.locator("button[tabindex='0'][data-jour]"),
  ).toHaveCount(1);

  // Flèches : un jour, une semaine, d'un mois sur l'autre.
  await page.keyboard.press("ArrowRight");
  await expect(jour(calendrier, il(31))).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(jour(calendrier, il(38))).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowLeft");
  await expect(jour(calendrier, depart)).toBeFocused();

  // Début et Fin : lundi et dimanche de la semaine.
  const lundi = debutDeSemaine(depart);
  const dimanche = finDeSemaine(depart);
  await page.keyboard.press("Home");
  await expect(jour(calendrier, lundi)).toBeFocused();
  await page.keyboard.press("End");
  await expect(jour(calendrier, dimanche)).toBeFocused();

  // Entrée choisit, et l'annonce le dit.
  await page.keyboard.press("Enter");
  await expect(jour(calendrier, dimanche)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(calendrier.getByRole("status")).toHaveText(
    `${libelleJour(dimanche)} sélectionné`,
  );
});

test("aujourd'hui est repéré, les jours passés sont refusés", async ({
  page,
}) => {
  const calendrier = await surLEtapeDateEtLieu(page);
  const aujourdhui = il(0);

  await expect(jour(calendrier, aujourdhui)).toHaveAttribute(
    "aria-current",
    "date",
  );
  await expect(jour(calendrier, aujourdhui)).toBeEnabled();
  // Le mois en cours n'a pas de mois précédent à ouvrir.
  const precedent = calendrier.getByRole("button", { name: "Mois précédent" });
  await expect(precedent).toHaveAttribute("aria-disabled", "true");
  await precedent.click({ force: true });
  await expect(calendrier).toContainText(libelleMois(moisDe(aujourdhui)));
  // La veille, quand elle est dans le même mois, ne se choisit pas.
  if (il(-1).slice(0, 7) === aujourdhui.slice(0, 7))
    await expect(jour(calendrier, il(-1))).toBeDisabled();

  // Début ne mène jamais à un jour passé.
  await jour(calendrier, aujourdhui).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(jour(calendrier, aujourdhui)).toBeFocused();
});

test("les jours se touchent du doigt à 360 px, sans faire défiler la page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const calendrier = await surLEtapeDateEtLieu(page);

  const boites = await calendrier
    .locator("button[data-jour]")
    .evaluateAll((boutons) =>
      boutons.map((b) => {
        const { width, height } = b.getBoundingClientRect();
        return { width, height };
      }),
    );
  expect(boites.length).toBeGreaterThanOrEqual(28);
  for (const { width, height } of boites) {
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }
  const debordement = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(debordement).toBeLessThanOrEqual(0);
});

for (const reglage of ["clair", "sombre", "grands caractères"] as const) {
  test(`aucune violation d'accessibilité sur l'étape, en thème ${reglage}`, async ({
    page,
  }) => {
    const calendrier = await surLEtapeDateEtLieu(page);
    await page.evaluate((reglage) => {
      const racine = document.documentElement;
      if (reglage === "sombre") racine.setAttribute("data-theme", "sombre");
      if (reglage === "grands caractères")
        racine.setAttribute("data-taille", "grands");
    }, reglage);
    await choisirDate(page, il(30));
    await calendrier.getByRole("button", { name: "Mois suivant" }).click();

    const resultat = await new AxeBuilder({ page }).include("main").analyze();
    const graves = resultat.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(graves, JSON.stringify(graves, null, 2)).toEqual([]);
  });
}
