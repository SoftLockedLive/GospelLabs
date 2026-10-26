import { expect, test, type Page } from "@playwright/test";
import { createInvestigation, expectSaved, goToSection } from "./helpers";

const notice = (page: Page) => page.getByRole("status").filter({ hasText: "A new version of Gospel Labs is available." });

test("the deployed build's manifest matches the running app, and a different one is noticed", async ({ page }) => {
  // The built /version.json carries the same build id the app was compiled with: no notice.
  const checked = page.waitForResponse((response) => response.url().includes("/version.json"));
  await page.goto("/");
  const response = await checked;
  expect(response.status()).toBe(200);
  expect(response.request().url()).toMatch(/\/version\.json\?t=\d+$/); // unique URL: no cache can answer
  await page.waitForTimeout(1_000); // give the check time to finish before asserting a negative
  await expect(notice(page)).toHaveCount(0);

  // With the service worker in control, the manifest still comes from the network, never a cache:
  // a different deployed build is noticed when the tab is shown again.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await page.route("**/version.json*", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ version: "a-newer-build" }) }),
  );
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(notice(page)).toBeVisible();
});

test("a newer deployment is announced, and updating saves work before reloading", async ({ page }) => {
  await createInvestigation(page, "Before the update");
  // Pretend a different build has been deployed.
  await page.route("**/version.json*", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ version: "a-newer-build" }) }),
  );
  await page.reload();
  await expect(notice(page)).toBeVisible();

  // An unfinished form blocks the reload until the user decides.
  await page.getByRole("button", { name: "Add evidence", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Source title or reference" }).fill("Half-written");
  await notice(page).getByRole("button", { name: "Update now" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "An unfinished form is open (New evidence)" })).toBeVisible();
  await page.locator("form").getByRole("button", { name: "Cancel" }).click();

  // Edits still waiting for autosave are saved first, then the page reloads.
  await goToSection(page, "Question");
  await page.getByRole("textbox", { name: "Context" }).fill("Typed just before updating");
  const reloaded = page.waitForEvent("load");
  await notice(page).getByRole("button", { name: "Update now" }).click();
  await reloaded;
  await expect(page.getByRole("textbox", { name: "Context" })).toHaveValue("Typed just before updating");
  await expectSaved(page);
});

test("from 2.1, the notice names the new release and what changed in it", async ({ page }) => {
  await page.goto("/");
  await page.route("**/version.json*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ version: "a-newer-build", release: "9.9.0", title: "Something new", highlights: ["First change", "Second change"] }),
    }),
  );
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  const announced = page.getByRole("status").filter({ hasText: "Gospel Labs 9.9.0 is available: Something new." });
  await expect(announced).toBeVisible();
  await expect(announced.getByRole("listitem")).toHaveText(["First change", "Second change"]);
  await expect(announced.getByRole("button", { name: "Update now" })).toBeVisible();
});
