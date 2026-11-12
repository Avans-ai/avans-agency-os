import { defineConfig } from "@playwright/test";
/* E2E_PORT permite correr la suite contra otro puerto (p. ej. 3510) sin chocar con otros servidores locales. */
const port = Number(process.env.E2E_PORT ?? 3000);
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 2,
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  projects: [
    {
      name: "domain",
      testMatch: [
        "discovery-model.spec.ts",
        "knowledge-model.spec.ts",
        "google-workspace.spec.ts",
        "intake-presentation-model.spec.ts",
        "modules-reports-model.spec.ts",
      ],
    },
    {
      name: "browser",
      testMatch: [
        "discovery-browser.spec.ts",
        "knowledge-browser.spec.ts",
        "intake-presentation-browser.spec.ts",
        "modules-browser.spec.ts",
      ],
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `http://127.0.0.1:${port}/v2`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
