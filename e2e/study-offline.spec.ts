/**
 * Offline and private: after a first visit online, the 2.0 pages open
 * offline (every investigation, passage, and attribute is cached by the
 * service worker) and an investigation can be studied without a connection.
 * During a full study session nothing is requested from anywhere but this
 * site: no analytics, no fonts or scripts from elsewhere, and no AI service.
 */
import { expect, test, type Request } from "@playwright/test";
import { completeInvestigation, investigation, pathSteps, readStore, solveStep, startInvestigation, stepArticle } from "./study-helpers";
import type { StudyProgress } from "@/domain/study/user-data";

test("after the first visit, the study pages open offline and an investigation can be studied", async ({ page, context, browserName }) => {
  test.skip(browserName === "firefox", "Playwright can't emulate offline service-worker requests in Firefox");
  await page.goto("/");
  // The service worker activates once it has cached the app shell and every content page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  const pages = [
    { path: "/investigate/one-by-one", heading: "One by One" },
    { path: "/explore/he-will-take-upon-him", heading: "He will take upon Him" },
    { path: "/character/meekness", heading: "Meekness" },
    { path: "/connect", heading: "Connect with Christ" },
    { path: "/notebook", heading: "Notebook" },
    { path: "/settings/about", heading: "About Gospel Labs" },
    { path: "/map", heading: "Your Map of understanding" },
    { path: "/investigate/families-beyond-the-veil", heading: "Loved Ones Beyond the Veil" },
  ];
  for (const { path, heading } of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  await expect(page.getByText("You’re offline.")).toBeVisible();

  // Study offline: begin, answer, move on, and resume after a reload.
  const inv = investigation("one-by-one");
  const steps = pathSteps(inv, "quick");
  await startInvestigation(page, inv.id, { difficulty: "easy", length: "quick" });
  await solveStep(page, steps[0], "easy");
  await expect(stepArticle(page, steps[1])).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: `Resume · step 2 of ${steps.length}` }).click();
  await expect(stepArticle(page, steps[1])).toBeVisible();
  // Scripture Explorer works offline too.
  await page.goto("/explore/he-will-take-upon-him");
  const words = page.getByRole("group", { name: /words you can highlight/ });
  await words.locator('[data-verse="12"]').getByRole("button", { name: "succor", exact: true }).click();
  await page.getByRole("button", { name: "Save highlight" }).click();
  await expect(page.getByRole("region", { name: /^Your highlights/ }).getByRole("listitem")).toHaveCount(1);

  await context.setOffline(false);
  await page.goto(`/investigate/${inv.id}`);
  await expect(page.getByRole("button", { name: `Resume · step 2 of ${steps.length}` })).toBeVisible();
  const [progress] = await readStore<StudyProgress>(page, "studyProgress");
  expect(progress.steps[steps[0].id]?.status).toBe("complete");
});

test("a full study session makes no requests to any other site, and nothing is labeled AI-generated", async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const requests: string[] = [];
  const record = (request: Request) => requests.push(request.url());
  context.on("request", record);

  await completeInvestigation(page, "again-and-again", { difficulty: "medium", length: "quick" });
  await expect(page.getByRole("main")).not.toContainText("AI-generated");
  await page.getByRole("link", { name: "Open in Notebook" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "See on Map", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your Map of understanding" })).toBeVisible();
  await page.goto("/explore/he-will-take-upon-him");
  await page.getByRole("tab", { name: "Key words" }).click();
  await page.goto("/character/meekness");
  await page.getByRole("region", { name: "Words to know" }).getByRole("button").first().click();
  await page.goto("/connect");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.goto("/settings/privacy");
  await expect(page.getByText("No AI.", { exact: false })).toBeVisible();

  context.off("request", record);
  expect(requests.length).toBeGreaterThan(10);
  const elsewhere = requests.filter((url) => !url.startsWith(`${origin}/`) && !url.startsWith("data:") && !url.startsWith("blob:"));
  expect(elsewhere, "Requests to other sites").toEqual([]);
});
