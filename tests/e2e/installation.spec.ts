import {
  devices,
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  MOT_DE_PASSE,
  nouveauResident,
  nouvelleActivite,
  supprimerComptes,
  titreAccueil,
} from "./outils";

const appareil = devices["iPhone 15"];
const iPhone = {
  userAgent: appareil.userAgent,
  viewport: appareil.viewport,
  deviceScaleFactor: appareil.deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
};

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

test.describe("manifeste et icônes", () => {
  test("le manifeste décrit l'app installable de la résidence", async ({
    request,
  }) => {
    const reponse = await request.get("/manifest.webmanifest");
    expect(reponse.ok()).toBe(true);

    const manifeste = await reponse.json();
    expect(manifeste).toMatchObject({
      name: "Résidence Les Tilleuls",
      short_name: "Les Tilleuls",
      start_url: "/",
      display: "standalone",
      background_color: "#f8f9ff",
      theme_color: "#f8f9ff",
    });

    const icones: { src: string; sizes: string; purpose?: string }[] =
      manifeste.icons;
    expect(icones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512" }),
        expect.objectContaining({ purpose: "maskable" }),
      ]),
    );
    for (const icone of icones) {
      await attendreImagePng(request, icone.src);
    }
  });

  test("la page annonce le manifeste, l'icône Apple et le mode web app", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /\/manifest\.webmanifest/,
    );
    const iconeApple = page.locator('link[rel="apple-touch-icon"]');
    await expect(iconeApple).toHaveAttribute("sizes", "180x180");
    await attendreImagePng(request, (await iconeApple.getAttribute("href"))!);

    await expect(
      page.locator('meta[name="mobile-web-app-capable"]'),
    ).toHaveAttribute("content", "yes");
  });

  test("le manifeste et les icônes restent accessibles sans session", async ({
    playwright,
    baseURL,
  }) => {
    const visiteur = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const manifeste = await visiteur.get("/manifest.webmanifest", {
        maxRedirects: 0,
      });
      expect(manifeste.status()).toBe(200);

      const { icons } = await manifeste.json();
      const chemins = [
        ...icons.map((icone: { src: string }) => icone.src),
        "/icon.png",
        "/apple-icon.png",
      ];
      for (const chemin of chemins) {
        const reponse = await visiteur.get(chemin, { maxRedirects: 0 });
        expect(reponse.status(), chemin).toBe(200);
      }
    } finally {
      await visiteur.dispose();
    }
  });

  test("aucun service worker n'est enregistré", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const inscriptions = await page.evaluate(async () =>
      "serviceWorker" in navigator
        ? (await navigator.serviceWorker.getRegistrations()).length
        : 0,
    );
    expect(inscriptions).toBe(0);
  });
});

test.describe("aide à l'installation sur iPhone", () => {
  test.use(iPhone);

  test("le bandeau montre le geste, se masque et ne revient pas", async ({
    page,
  }) => {
    await page.goto("/");

    const bandeau = aideInstallation(page);
    await expect(bandeau).toBeVisible();
    await expect(bandeau).toContainText("Partager");
    await expect(bandeau).toContainText("Sur l'écran d'accueil");

    await page.screenshot({
      path: test.info().outputPath("aide-installation-iphone.png"),
      fullPage: true,
    });

    const masquer = bandeau.getByRole("button", { name: /masquer/i });
    const boite = await masquer.boundingBox();
    expect(boite?.width).toBeGreaterThanOrEqual(52);
    expect(boite?.height).toBeGreaterThanOrEqual(52);

    await masquer.click();
    await expect(bandeau).toBeHidden();

    await page.reload({ waitUntil: "networkidle" });
    await expect(aideInstallation(page)).toBeHidden();
  });

  test("le bandeau se masque au clavier", async ({ page }) => {
    await page.goto("/");

    const masquer = aideInstallation(page).getByRole("button", {
      name: /masquer/i,
    });
    await masquer.focus();
    await page.keyboard.press("Enter");
    await expect(aideInstallation(page)).toBeHidden();
  });

  test("le bandeau apparaît sans faire sauter l'Accueil, au-dessus de la barre du bas", async ({
    page,
    browser,
  }) => {
    await accueilDeResident(page);
    await expect(aideInstallation(page)).toBeVisible();
    const aLaUne = await page
      .getByRole("region", { name: "À la une" })
      .boundingBox();

    // Sans JavaScript, la page reste telle que le serveur l'envoie : avant l'arrivée du bandeau.
    const sansScript = await browser.newContext({
      ...iPhone,
      javaScriptEnabled: false,
      storageState: await page.context().storageState(),
    });
    try {
      const pageServeur = await sansScript.newPage();
      await pageServeur.goto("/");
      await expect(aideInstallation(pageServeur)).toBeHidden();
      expect(
        await pageServeur
          .getByRole("region", { name: "À la une" })
          .boundingBox(),
      ).toEqual(aLaUne);
    } finally {
      await sansScript.close();
    }

    await verifierBandeauAuDessusDeLaBarre(page);
  });

  test("la dernière activité se lit et se touche au-dessus du bandeau", async ({
    page,
  }) => {
    await accueilDeResident(page);
    await expect(aideInstallation(page)).toBeVisible();

    await verifierDerniereCarteAuDessusDuBandeau(page);
  });

  test("le bandeau n'apparaît jamais dans l'app installée", async ({
    page,
  }) => {
    await simulerAppInstallee(page);
    await ouvrirAccueil(page);
    await expect(aideInstallation(page)).toBeHidden();
  });
});

test.describe("aide à l'installation sur Android", () => {
  test.skip(
    ({ isMobile }) => !isMobile,
    "Le bandeau Android ne concerne que la navigation mobile.",
  );

  test("le bouton du bandeau déclenche l'invite du navigateur", async ({
    page,
  }) => {
    await ouvrirAccueil(page);
    await expect(aideInstallation(page)).toBeHidden();

    await proposerInstallation(page);

    const bandeau = aideInstallation(page);
    const installer = bandeau.getByRole("button", {
      name: "Installer l'application",
    });
    await expect(installer).toBeVisible();
    const boite = await installer.boundingBox();
    expect(boite?.height).toBeGreaterThanOrEqual(52);

    await page.screenshot({
      path: test.info().outputPath("aide-installation-android.png"),
      fullPage: true,
    });

    await installer.click();
    await expect
      .poll(() => page.evaluate(() => window.__invitesOuvertes))
      .toBe(1);
    await expect(bandeau).toBeHidden();
    await expect(page.locator("#contenu")).toBeFocused();
  });

  test("le bandeau arrive avec l'invite sans rien déplacer dans la page", async ({
    page,
  }) => {
    await accueilDeResident(page);
    const aLaUne = page.getByRole("region", { name: "À la une" });
    const avant = await aLaUne.boundingBox();

    await proposerInstallation(page);

    await expect(aideInstallation(page)).toBeVisible();
    expect(await aLaUne.boundingBox()).toEqual(avant);
    await verifierBandeauAuDessusDeLaBarre(page);
    await verifierDerniereCarteAuDessusDuBandeau(page);
  });

  test("l'invite reçue sur une autre page sert en arrivant sur l'accueil", async ({
    page,
  }) => {
    await page.goto("/annonces", { waitUntil: "networkidle" });
    await proposerInstallation(page);

    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Accueil" })
      .click();

    await expect(
      aideInstallation(page).getByRole("button", {
        name: "Installer l'application",
      }),
    ).toBeVisible();
  });
});

test("le bandeau n'apparaît pas en navigation sur ordinateur", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Vérification propre à l'ordinateur.");
  await ouvrirAccueil(page);
  await proposerInstallation(page);

  await expect(aideInstallation(page)).toBeHidden();
});

declare global {
  interface Window {
    __invitesOuvertes?: number;
  }
}

/** Ouvre l'accueil et attend que la page soit interactive : une absence ne prouve rien avant. */
async function ouvrirAccueil(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(titreAccueil(page)).toBeVisible();
}

/** Un résident connecté, sur un Accueil qui a « À la une » et une activité dans la grille. */
async function accueilDeResident(page: Page) {
  const resident = await nouveauResident();
  emails.push(resident.email);
  await nouvelleActivite(resident.id, { titre: "Atelier tricot" });
  await nouvelleActivite(resident.id, { titre: "Soirée jeux" });

  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(resident.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(titreAccueil(page)).toBeVisible();
  await ouvrirAccueil(page);
}

/** Bandeau fixé au bas de l'écran, à 12 px des bords, juste au-dessus de la barre du bas. */
async function verifierBandeauAuDessusDeLaBarre(page: Page) {
  const barre = page.getByRole("navigation", { name: "Navigation principale" });
  const bandeau = await aideInstallation(page).boundingBox();
  const boiteBarre = await barre.boundingBox();
  const largeur = page.viewportSize()!.width;

  expect(
    await aideInstallation(page).evaluate(
      (element) => getComputedStyle(element).position,
    ),
  ).toBe("fixed");
  expect(bandeau!.x).toBeCloseTo(12, 0);
  expect(bandeau!.x + bandeau!.width).toBeCloseTo(largeur - 12, 0);
  expect(bandeau!.y + bandeau!.height).toBeLessThanOrEqual(boiteBarre!.y);
  expect(bandeau!.y + bandeau!.height).toBeGreaterThan(boiteBarre!.y - 24);
}

/** Tout en bas de l'Accueil, la dernière carte finit au-dessus du bandeau et reste touchable. */
async function verifierDerniereCarteAuDessusDuBandeau(page: Page) {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const derniere = page.getByRole("main").getByRole("article").last();
  const carte = await derniere.boundingBox();
  const bandeau = await aideInstallation(page).boundingBox();
  expect(carte!.y + carte!.height).toBeLessThanOrEqual(bandeau!.y);
  await derniere.getByRole("link").first().click({ trial: true });
}

function aideInstallation(page: Page) {
  return page.getByRole("region", { name: "Installer l'application" });
}

/** Rejoue l'événement que Chrome émet quand l'app devient installable. */
async function proposerInstallation(page: Page) {
  await page.evaluate(() => {
    window.__invitesOuvertes = 0;
    const invite = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt: async () => {
          window.__invitesOuvertes! += 1;
        },
        userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
      },
    );
    window.dispatchEvent(invite);
  });
}

/** Fait croire à la page qu'elle tourne dans l'app installée (`display-mode: standalone`). */
async function simulerAppInstallee(page: Page) {
  await page.addInitScript(() => {
    const matchMediaOriginal = window.matchMedia.bind(window);
    window.matchMedia = (requete: string) => {
      const liste = matchMediaOriginal(requete);
      if (!requete.includes("display-mode: standalone")) return liste;
      return new Proxy(liste, {
        get(cible, cle) {
          if (cle === "matches") return true;
          const valeur = Reflect.get(cible, cle, cible);
          return typeof valeur === "function" ? valeur.bind(cible) : valeur;
        },
      });
    };
  });
}

async function attendreImagePng(request: APIRequestContext, chemin: string) {
  const reponse = await request.get(chemin);
  expect(reponse.ok(), chemin).toBe(true);
  expect(reponse.headers()["content-type"], chemin).toBe("image/png");
}
