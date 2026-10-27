import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices, type Project } from "@playwright/test";

const PORT = 3210;
/** The release being tested (package.json; see docs/VERSIONING.md). */
const RELEASE = (JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8")) as { version: string }).version;

/**
 * End-to-end tests run against the static production build in out/ (the
 * service worker is only active in production), served like Atlas serves it,
 * with the production security headers. Run `npm run build` first, then
 * `npm run test:e2e`.
 *
 * Chromium (desktop and Pixel 7) always runs. Set CHROMIUM_PATH to use an
 * already-installed Chromium instead of running `npx playwright install chromium`.
 *
 * Firefox and WebKit are opt-in: E2E_BROWSERS=firefox,webkit npm run test:e2e
 * (install them first with `npx playwright install firefox webkit`).
 */
const chromium = { launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {} };
const extra = new Set((process.env.E2E_BROWSERS ?? "").split(",").map((name) => name.trim()));

const projects: Project[] = [
  { name: "desktop", use: { ...devices["Desktop Chrome"], ...chromium } },
  { name: "mobile", use: { ...devices["Pixel 7"], ...chromium } },
  ...(extra.has("firefox") ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }] : []),
  ...(extra.has("webkit") ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }] : []),
];

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Dates show in the learner's time zone; a fixed one keeps date assertions the same on every machine.
    timezoneId: "UTC",
    // Most tests are about a learner already using this version: the welcome and What's new are
    // marked as seen, so they don't appear. e2e/release-notes.spec.ts opts out to test them.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [
            { name: "gospel-labs:last-seen-version", value: RELEASE },
            { name: "gospel-labs:welcome", value: "done" },
          ],
        },
      ],
    },
    trace: "retain-on-failure",
  },
  projects,
  webServer: {
    command: `node scripts/serve-out.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
