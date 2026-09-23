import { defineConfig, devices } from "@playwright/test";

// PORT_E2E : un autre port quand un second worktree lance ses tests en même temps.
const port = Number(process.env.PORT_E2E ?? 3100);

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
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
