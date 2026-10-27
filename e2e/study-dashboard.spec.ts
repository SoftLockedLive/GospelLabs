/**
 * The home dashboard: one clear way to start studying, a quick/deep choice
 * that sticks, "pick up where you left off" once an investigation is under
 * way, and the latest Discovery Cards once one is finished.
 */
import { expect, test } from "@playwright/test";
import type { DiscoveryCard } from "@/domain/study/user-data";
import { completeInvestigation, expectNoScoring, investigation, pathSteps, pick, readStore, solveStep, startInvestigation, stepArticle } from "./study-helpers";

const hero = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "What would you like to study today?" });

test("starting to study takes two interactions from the dashboard", async ({ page }) => {
  await page.goto("/");
  const start = hero(page).getByRole("link", { name: "Start this investigation" });
  await expect(start).toBeVisible();
  const href = await start.getAttribute("href");
  const id = href!.split("/").pop()!;
  const suggested = investigation(id);
  await expect(hero(page).getByRole("heading", { level: 2 })).toHaveText(suggested.title);

  // 1: the hero's primary action; 2: begin with the defaults.
  await start.click();
  await expect(page.getByRole("heading", { level: 1, name: suggested.title })).toBeVisible();
  await page.getByRole("button", { name: "Begin the investigation" }).click();
  await expect(stepArticle(page, pathSteps(suggested, "quick")[0])).toBeVisible();
  await expectNoScoring(page);
});

test("the quick or deep choice persists across reloads and is shared with Settings", async ({ page }) => {
  await page.goto("/");
  const length = hero(page).getByRole("group", { name: "How much time do you have?" });
  await expect(length.getByRole("radio", { name: /^Quick/ })).toBeChecked();
  await expect(page.getByText("Chosen for a quick study.")).toBeVisible();

  await pick(length.getByRole("radio", { name: /^Deep/ }));
  await expect(hero(page).getByText("A deep study adds deeper steps, side questions, and time to reflect.")).toBeVisible();
  await expect(hero(page).getByText("For a deep study")).toBeVisible();
  await expect(page.getByText("Chosen for a deep study.")).toBeVisible();

  await page.reload();
  await expect(length.getByRole("radio", { name: /^Deep/ })).toBeChecked();
  await expect(page.getByText("Chosen for a deep study.")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("radio", { name: /^Deep study/ })).toBeChecked();
  // A deep study is where new investigations start.
  await page.goto("/");
  await hero(page).getByRole("link", { name: "Start this investigation" }).click();
  await expect(page.getByRole("group", { name: "Session" }).getByRole("radio", { name: /^Deep/ })).toBeChecked();
});

test("an investigation in progress is offered first, and others under Continue studying", async ({ page }) => {
  const first = await startInvestigation(page, "again-and-again", { difficulty: "easy", length: "quick" });
  await solveStep(page, pathSteps(first, "quick")[0], "easy");
  await expect(stepArticle(page, pathSteps(first, "quick")[1])).toBeVisible();

  await page.goto("/");
  const focus = hero(page);
  await expect(focus.getByText("Pick up where you left off")).toBeVisible();
  await expect(focus.getByRole("heading", { level: 2 })).toHaveText(first.title);
  await expect(focus.getByText(`Step 2 of ${pathSteps(first, "quick").length}`, { exact: true })).toBeVisible();
  await expect(focus.getByText("Quick study", { exact: true })).toBeVisible();
  // No "Continue studying" list yet: the only investigation in progress is already the hero's.
  await expect(page.getByRole("region", { name: "Continue studying" })).toHaveCount(0);

  // A second investigation becomes the most recent; the first moves to "Continue studying".
  const second = await startInvestigation(page, "fear-god-friend", { difficulty: "medium", length: "deep" });
  await page.goto("/");
  await expect(focus.getByRole("heading", { level: 2 })).toHaveText(second.title);
  await expect(focus.getByText("Deep study", { exact: true })).toBeVisible();
  const continuing = page.getByRole("region", { name: "Continue studying" });
  await expect(continuing.getByRole("article")).toHaveCount(1);
  await expect(continuing.getByRole("link", { name: first.title })).toBeVisible();
  await expect(continuing).toContainText(`Step 2 of ${pathSteps(first, "quick").length}`);
  // Neither in-progress investigation is suggested again as a new one.
  const suggested = page.getByRole("region", { name: "Start a new investigation" });
  await expect(suggested.getByRole("link", { name: first.title })).toHaveCount(0);
  await expect(suggested.getByRole("link", { name: second.title })).toHaveCount(0);

  // The investigations page shows the same progress on each card.
  await page.getByRole("link", { name: "All investigations" }).click();
  const card = (title: string) => page.getByRole("article").filter({ has: page.getByRole("heading", { level: 2, name: title, exact: true }) });
  await expect(card(first.title)).toContainText(`Step 2 of ${pathSteps(first, "quick").length}`);
  await expect(card(first.title)).toContainText("Continue");
  await expect(card(second.title)).toContainText(`Step 1 of ${pathSteps(second, "deep").length}`);
  await page.goto("/");

  // Continuing goes straight back to the step the learner was on, and Back returns to the investigation's overview.
  await continuing.getByRole("link", { name: first.title }).click();
  await expect(stepArticle(page, pathSteps(first, "quick")[1])).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: `Resume · step 2 of ${pathSteps(first, "quick").length}` })).toBeVisible();

  // So does the hero's "Continue studying".
  await page.goto("/");
  await focus.getByRole("link", { name: "Continue studying" }).click();
  await expect(stepArticle(page, pathSteps(second, "deep")[0])).toBeVisible();
});

test("a finished investigation's Discovery Card appears under Your discoveries", async ({ page }) => {
  const done = await completeInvestigation(page, "one-by-one", { difficulty: "medium", length: "quick" });
  const [card] = await readStore<DiscoveryCard>(page, "discoveries");

  await page.goto("/");
  const discoveries = page.getByRole("region", { name: "Your discoveries" });
  await expect(discoveries.getByText("1 discovery", { exact: true })).toBeVisible();
  const item = discoveries.getByRole("article").filter({ hasText: done.title });
  await expect(item).toContainText("Investigation");
  await expect(item).toContainText(done.question);
  await expect(item).toContainText("Saved today");
  // It's no longer in progress, so the hero suggests something new.
  await expect(hero(page).getByText("Pick up where you left off")).toHaveCount(0);
  await expect(discoveries.getByRole("link", { name: "Open your Map" })).toBeVisible();

  await item.getByRole("link", { name: done.title }).click();
  await expect(page).toHaveURL(`/notebook?card=${card.id}`);
  await expect(page.getByRole("heading", { level: 1, name: done.title })).toBeVisible();
});
