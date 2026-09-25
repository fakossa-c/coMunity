import { expect, test, type Locator, type Page } from "@playwright/test";
import { MOT_DE_PASSE, nouveauResident, supprimerComptes } from "./outils";

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
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
  await page.getByRole("link", { name: "Proposer" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Proposer" }),
  ).toBeVisible();

  const titre = "Atelier compost du jeudi";
  await page.getByLabel("Titre de l'activité").fill(titre);
  await page.getByLabel("Catégorie").selectOption({ label: "Jardin & Nature" });
  await page
    .getByLabel("Mot d'accueil")
    .fill("On apprend à composter ensemble, dans la cour.");
  await page.getByRole("button", { name: "Continuer" }).click();
  const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await page.getByLabel("Date").fill(dansUnMois);
  await page.getByLabel("Heure de début").fill("10:00");
  await page.getByLabel("Heure de fin").fill("11:30");
  await page.getByLabel("Lieu").fill("Cour intérieure");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre activité est publiée" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Accueil" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  const catalogue = page.getByRole("list", { name: "Activités à venir" });
  await expect(catalogue).toContainText(titre);
  await expect(catalogue).toContainText("Cour intérieure");
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

test.describe("onglets et puces de l'écran Activités", () => {
  test("l'onglet actif se souligne en terre cuite, sans fond pilule", async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    const ongletActif = page.getByRole("tab", { name: "J'y vais" });
    await expect(ongletActif).toHaveAttribute("aria-selected", "true");
    // Terre cuite d'interface (--color-primary : #8f2b00), en bordure basse, pas en fond.
    expect(await styleCalcule(ongletActif, "background-color")).toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(await styleCalcule(ongletActif, "border-bottom-width")).toBe("4px");
    expect(await styleCalcule(ongletActif, "border-bottom-color")).toBe(
      "rgb(143, 43, 0)",
    );

    const ongletInactif = page.getByRole("tab", { name: "J'organise" });
    await expect(ongletInactif).toHaveAttribute("aria-selected", "false");
    // La bordure basse reste transparente : garde l'alignement vertical sans souligner.
    expect(await styleCalcule(ongletInactif, "border-bottom-color")).toBe(
      "rgba(0, 0, 0, 0)",
    );
  });

  test("la puce sélectionnée est pêche pleine avec coche et pictogramme, non sélectionnée blanche bordée pêche", async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    const puceSelectionnee = page.getByRole("link", { name: /À venir/ });
    await expect(puceSelectionnee).toHaveAttribute("aria-current", "true");
    expect(
      await styleCalcule(puceSelectionnee, "background-color"),
    ).toBe("rgb(255, 219, 208)");
    await expect(
      puceSelectionnee.locator('svg[aria-hidden="true"]'),
    ).toHaveCount(2); // pictogramme "event" + coche.
    expect(await styleCalcule(puceSelectionnee, "height")).toBe("52px");

    const puceNonSelectionnee = page.getByRole("link", { name: /Passées/ });
    await expect(puceNonSelectionnee).toHaveAttribute("aria-current", "false");
    expect(
      await styleCalcule(puceNonSelectionnee, "background-color"),
    ).toBe("rgb(255, 255, 255)");
    expect(await styleCalcule(puceNonSelectionnee, "border-color")).toBe(
      "rgb(255, 181, 156)",
    );
  });

  test("les onglets et les puces collent ensemble en haut de l'écran", async ({
    page,
  }) => {
    const resident = await nouveauResident("valide");
    emails.push(resident.email);
    await seConnecter(page, resident.email);
    await page.goto("/activites");

    const bloc = page.getByRole("tablist", { name: "Mes activités" }).locator("..");
    expect(await styleCalcule(bloc, "position")).toBe("sticky");
    expect(await styleCalcule(bloc, "top")).toBe("0px");
  });
});
