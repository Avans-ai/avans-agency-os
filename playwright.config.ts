import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
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
        "pptx-*-model.spec.ts",
      ],
    },
    {
      name: "browser",
      testMatch: [
        "discovery-browser.spec.ts",
        "knowledge-browser.spec.ts",
        "intake-presentation-browser.spec.ts",
        "pptx-*-browser.spec.ts",
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
