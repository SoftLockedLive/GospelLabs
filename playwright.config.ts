import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;

/**
 * End-to-end tests run against a production build (the service worker is
 * only active in production). Run `npm run build` first, then `npm run test:e2e`.
 *
 * Set CHROMIUM_PATH to use an already-installed Chromium instead of running
 * `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
