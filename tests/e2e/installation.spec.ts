import { devices, expect, test, type Page } from "@playwright/test";

const iPhone = devices["iPhone 15"];

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
    await expect(
      page.locator('meta[name="apple-mobile-web-app-title"]'),
    ).toHaveAttribute("content", "Les Tilleuls");
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
  test.use({
    userAgent: iPhone.userAgent,
    viewport: iPhone.viewport,
    deviceScaleFactor: iPhone.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  });

  test("l'encart montre le geste, se masque et ne revient pas", async ({
    page,
  }) => {
    await page.goto("/");

    const encart = aideInstallation(page);
    await expect(encart).toBeVisible();
    await expect(encart).toContainText("Partager");
    await expect(encart).toContainText("Sur l'écran d'accueil");

    await page.screenshot({
      path: test.info().outputPath("aide-installation-iphone.png"),
      fullPage: true,
    });

    const masquer = encart.getByRole("button", { name: /masquer/i });
    const boite = await masquer.boundingBox();
    expect(boite?.width).toBeGreaterThanOrEqual(52);
    expect(boite?.height).toBeGreaterThanOrEqual(52);

    await masquer.click();
    await expect(encart).toBeHidden();

    await page.reload({ waitUntil: "networkidle" });
    await expect(aideInstallation(page)).toBeHidden();
  });

  test("l'encart se masque au clavier", async ({ page }) => {
    await page.goto("/");

    const masquer = aideInstallation(page).getByRole("button", {
      name: /masquer/i,
    });
    await masquer.focus();
    await page.keyboard.press("Enter");
    await expect(aideInstallation(page)).toBeHidden();
  });

  test("l'encart n'apparaît jamais dans l'app installée", async ({ page }) => {
    await simulerAppInstallee(page);
    await ouvrirAccueil(page);
    await expect(aideInstallation(page)).toBeHidden();
  });
});

test.describe("aide à l'installation sur Android", () => {
  test.skip(
    ({ isMobile }) => !isMobile,
    "L'encart Android ne concerne que la navigation mobile.",
  );

  test("le bouton de l'encart déclenche l'invite du navigateur", async ({
    page,
  }) => {
    await ouvrirAccueil(page);
    await expect(aideInstallation(page)).toBeHidden();

    await proposerInstallation(page);

    const encart = aideInstallation(page);
    const installer = encart.getByRole("button", { name: "Installer l'app" });
    await expect(installer).toBeVisible();
    const boite = await installer.boundingBox();
    expect(boite?.height).toBeGreaterThanOrEqual(52);

    await installer.click();
    await expect
      .poll(() => page.evaluate(() => window.__invitesOuvertes))
      .toBe(1);
    await expect(encart).toBeHidden();
  });
});

test("l'encart n'apparaît pas en navigation sur ordinateur", async ({
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
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
}

function aideInstallation(page: Page) {
  return page.getByRole("region", { name: "Installer l'app" });
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

async function attendreImagePng(
  request: import("@playwright/test").APIRequestContext,
  chemin: string,
) {
  const reponse = await request.get(chemin);
  expect(reponse.ok(), chemin).toBe(true);
  expect(reponse.headers()["content-type"], chemin).toBe("image/png");
}
