/**
 * The Journal (Notebook › Journal): free writing (a thought, a tender mercy, a question) that is kept with the
 * place it was written, and everything written elsewhere while studying, gathered in one place.
 */
import { expect, test, type Page } from "@playwright/test";
import { activityAt, investigation, pathSteps, readStore, solveStep, startInvestigation, stepArticle } from "./study-helpers";

const feed = (page: Page) => page.getByRole("region", { name: "Everything you’ve written" });
const item = (page: Page, text: string) => feed(page).getByRole("article").filter({ hasText: text });

test("a thought written during a step is kept in the Journal, linked back to that step", async ({ page }) => {
  const inv = await startInvestigation(page, "again-and-again", { difficulty: "easy", length: "quick" });
  const [first] = pathSteps(inv, "quick");
  await solveStep(page, first, "easy", { next: false });

  await stepArticle(page, first).getByRole("button", { name: "Write in your journal" }).click();
  const sheet = page.getByRole("dialog", { name: "Write in your journal" });
  await expect(sheet).toContainText(`${inv.title} · ${first.title}`);
  await sheet.getByRole("textbox", { name: "Your entry" }).fill("He keeps forgiving. So should I.");
  await sheet.getByRole("button", { name: "Save to journal" }).click();
  await expect(sheet.getByText("Saved to your journal.")).toBeVisible();
  await sheet.getByRole("link", { name: "Open your journal" }).click();

  await expect(page).toHaveURL("/notebook?view=journal");
  const entry = item(page, "He keeps forgiving. So should I.");
  await expect(entry).toContainText("A thought");
  const [stored] = await readStore<{ kind: string; link?: { kind: string; contentId: string; stepId?: string } }>(page, "journal");
  expect(stored).toMatchObject({ kind: "thought", link: { kind: "investigation", contentId: inv.id, stepId: first.id } });

  // The link leads back to the investigation.
  await entry.getByRole("link", { name: new RegExp(first.title) }).click();
  await expect(page).toHaveURL(`/investigate/${inv.id}`);
});

test("tender mercies can be written, edited, found, and deleted", async ({ page }) => {
  await page.goto("/notebook?view=journal");
  const write = page.getByRole("form", { name: "Write in your journal" });
  await write.getByText("Tender mercy", { exact: true }).click();
  await expect(write.getByText(/Elder David A\. Bednar/)).toBeVisible();
  await write.getByRole("textbox", { name: "Your entry" }).fill("A friend texted right when I needed it.");
  await write.getByRole("button", { name: "Save to journal" }).click();
  await expect(item(page, "A friend texted")).toContainText("Tender mercy");

  await write.getByText("A question", { exact: true }).click();
  await write.getByRole("textbox", { name: "Your entry" }).fill("Why does prayer feel quiet some days?");
  await write.getByRole("button", { name: "Save to journal" }).click();
  await expect(item(page, "Why does prayer feel quiet")).toContainText("A question");

  // Edit.
  const mercy = item(page, "A friend texted");
  await mercy.getByRole("button", { name: "Edit" }).click();
  await mercy.getByRole("textbox", { name: "Edit your entry" }).fill("A friend texted right when I needed it. That wasn’t an accident.");
  await mercy.getByRole("button", { name: "Save", exact: true }).click();
  await expect(feed(page).getByText("That wasn’t an accident.")).toBeVisible();

  // Search.
  await page.getByRole("searchbox", { name: "Search your journal" }).fill("prayer");
  await expect(feed(page).getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(feed(page).getByRole("article")).toHaveCount(2);

  // Delete.
  await item(page, "Why does prayer feel quiet").getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete this entry?" }).getByRole("button", { name: "Delete" }).click();
  await expect(feed(page).getByRole("article")).toHaveCount(1);
  expect(await readStore(page, "journal")).toHaveLength(1);
});

test("reflections written while studying appear in the Journal, where they were written", async ({ page }) => {
  const inv = investigation("again-and-again");
  const steps = pathSteps(inv, "quick");
  const reflectStep = steps.find((step) => activityAt(step, "easy").type === "reflect");
  test.skip(!reflectStep, "This investigation's quick path has no reflection step.");
  await startInvestigation(page, inv.id, { difficulty: "easy", length: "quick" });
  for (const step of steps) {
    const isReflection = step === reflectStep;
    await solveStep(page, step, "easy", { reflection: isReflection ? "I can come back every time." : undefined, next: step !== steps.at(-1) });
  }
  // Finishing saves a Discovery Card, which keeps a copy of the reflection.
  await page.getByRole("button", { name: "See your discovery" }).click();
  await expect(page.getByRole("heading", { level: 1, name: inv.title })).toBeVisible();

  await page.goto("/notebook?view=journal");
  const reflection = item(page, "I can come back every time.");
  await expect(reflection.first()).toContainText("Reflection");
  await expect(reflection.first()).toContainText(inv.title);
  // Written once, shown once, even though finishing copies it onto the Discovery Card too.
  await expect(reflection).toHaveCount(1);
});
