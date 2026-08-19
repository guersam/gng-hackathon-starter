import { defineConfig } from "@playwright/test";

const deployedBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: "list",
  use: {
    baseURL: deployedBaseURL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    viewport: { width: 320, height: 700 },
  },
  webServer: deployedBaseURL ? undefined : {
    command: "pnpm dev --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
