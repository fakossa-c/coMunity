import { defineConfig, devices } from "@playwright/test";

// PORT_E2E : un autre port quand un second worktree lance ses tests en même temps.
const port = Number(process.env.PORT_E2E ?? 3100);
// Le faux Jev (faux OpenRouter) des tests de l'assistant de création.
const portJev = Number(process.env.PORT_JEV_E2E ?? port + 1000);

// reuseExistingServer reste à false : un `playwright test` interrompu laisse son serveur vivant, et le
// lancement suivant le réutiliserait en silence (35 minutes muettes, rien d'enregistré). Port déjà pris :
// Playwright échoue aussitôt en nommant le port ; il suffit alors d'arrêter l'orphelin ou de changer de port.
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: `node tests/e2e/faux-jev.mjs ${portJev}`,
      url: `http://127.0.0.1:${portJev}/sante`,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npm run start -- --port ${port}`,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        OPENROUTER_API_KEY: "cle-de-test",
        OPENROUTER_BASE_URL: `http://127.0.0.1:${portJev}`,
        // Ouvre `/essai-erreur`, dont la lecture échoue à la demande (ecran-erreur.spec.ts).
        ESSAI_ERREUR_E2E: "1",
      },
    },
  ],
});
