import { expect, test } from "@playwright/test";
import { createInvestigation, expectSaved, goToSection, libraryItem } from "./helpers";

test("keeps working offline after the first visit", async ({ page, context, browserName }) => {
  // Playwright's offline mode doesn't reach service-worker requests in Firefox: the worker still
  // gets network responses, so this test can't tell cached pages from fresh ones there.
  test.skip(browserName === "firefox", "Playwright can't emulate offline service-worker requests in Firefox");
  await page.goto("/");
  // Wait until the service worker has installed and cached the app shell.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await createInvestigation(page, "Studied offline");

  await context.setOffline(true);

  // The app shell loads from the cache and says what needs a connection.
  await page.goto("/library");
  await expect(page.getByText("You’re offline.")).toBeVisible();
  await expect(page.getByText("Links to ChurchofJesusChrist.org need an internet connection.")).toBeVisible();

  // Saved investigations open and keep saving.
  await libraryItem(page, "Studied offline").getByRole("link", { name: /^Resume/ }).click();
  await goToSection(page, "Analysis");
  await page.getByRole("textbox", { name: "Analysis notes" }).fill("Written without a connection");
  await expectSaved(page);

  // New investigations can be started offline.
  await page.goto("/investigations/new");
  await page.getByRole("textbox", { name: "Question", exact: true }).fill("A question asked offline?");
  await page.getByRole("textbox", { name: "Title" }).fill("Offline question");
  await expectSaved(page);

  // The question bank is available too.
  await page.goto("/questions/born-again");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("born again");

  // Pages that were never cached show an honest offline page rather than an error.
  await page.goto("/questions/not-a-real-question");
  await expect(page.getByText("This page isn’t available offline")).toBeVisible();

  await context.setOffline(false);
  await page.goto("/library");
  await expect(libraryItem(page, "Offline question")).toBeVisible();
  await libraryItem(page, "Studied offline").getByRole("link", { name: /^Resume/ }).click();
  await expect(page.getByRole("textbox", { name: "Analysis notes" })).toHaveValue("Written without a connection");
});
