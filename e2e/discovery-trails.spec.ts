import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { expectSaved, goToSection, libraryItem, openActivity } from "./helpers";

const QUESTION = "How could Jesus Christ forgive sins before the Atonement?";
const trailPanel = (page: Page) => page.getByRole("region", { name: "Forgiveness before the Atonement" });
const stepTitle = (page: Page) => trailPanel(page).getByRole("heading", { level: 4 });
const stepButton = (page: Page, name: RegExp) =>
  trailPanel(page).getByRole("navigation", { name: "Trail steps" }).getByRole("button", { name });

test("explore a trail in any order, record discoveries, and resume where you left off", async ({ page }, testInfo) => {
  // The question bank shows which questions have a trail.
  await page.goto("/questions");
  await expect(page.getByText("Discovery trail · 5 steps")).toHaveCount(1);
  await page.goto("/questions/forgiveness-before-the-atonement");
  await expect(page.getByRole("heading", { name: "Discovery trail: Forgiveness before the Atonement" })).toBeVisible();
  await page.getByRole("link", { name: "Start investigation" }).click();

  // The Question section points to the trail, which lives in Research.
  await expect(page.getByRole("textbox", { name: "Question", exact: true })).toHaveValue(QUESTION);
  await page.getByRole("button", { name: "Open the trail" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Research" })).toBeVisible();
  await expect(stepTitle(page)).toHaveText("Sins forgiven in Capernaum");

  // The John 8 step separates what the text states from interpretation.
  await stepButton(page, /^Step 2:/).click();
  await expect(stepTitle(page)).toHaveText("“Neither do I condemn thee”");
  await expect(trailPanel(page)).toContainText("Stated in the text");
  await expect(trailPanel(page)).toContainText("does not record Him telling her that her sins were forgiven");
  await expect(trailPanel(page)).toContainText("Open to interpretation");

  // Steps aren't locked: jump to step 3, write, and mark it explored.
  await stepButton(page, /^Step 3:/).click();
  await expect(stepTitle(page)).toHaveText("As though He had already come");
  await trailPanel(page).getByRole("textbox", { name: "Your discoveries" }).fill("Belief that Christ would come.");
  await trailPanel(page).getByRole("checkbox", { name: /explored this step/ }).check();
  await expectSaved(page);
  await expect(page).toHaveURL(/\/investigations\/view\?id=/);
  await expect(trailPanel(page)).toContainText("1 of 5 steps explored");

  // A trail reference opens the evidence form with its source filled in.
  await trailPanel(page).getByRole("button", { name: "Record evidence from Mosiah 3:13" }).click();
  await expect(page.getByRole("textbox", { name: "Source title or reference" })).toHaveValue("Mosiah 3:13");
  await page.getByRole("textbox", { name: "Observation" }).fill("Believers could rejoice as though He had come.");
  await page.locator("form").getByRole("button", { name: "Add evidence" }).click();
  await openActivity(page, "Discover");
  await expect(trailPanel(page).getByText("Recorded")).toBeVisible();

  // Connections lead to related steps; a step can lead on to another section.
  await trailPanel(page).getByRole("article").getByRole("button", { name: "Step 4: Before Gethsemane and the cross" }).click();
  await expect(stepTitle(page)).toBeFocused();
  await trailPanel(page).getByRole("button", { name: "Continue in Analysis" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Analysis" })).toBeVisible();
  await expectSaved(page);

  // After a reload, the trail reopens at the step last viewed, with notes and progress intact.
  await page.reload();
  await goToSection(page, "Research");
  await expect(stepTitle(page)).toHaveText("Before Gethsemane and the cross");
  await stepButton(page, /^Step 3: .*\(explored\) \(has notes\)$/).click();
  await expect(trailPanel(page).getByRole("textbox", { name: "Your discoveries" })).toHaveValue(
    "Belief that Christ would come.",
  );
  await expect(trailPanel(page).getByRole("checkbox", { name: /explored this step/ })).toBeChecked();

  // My Library shows trail progress, and backups include the notes.
  await page.goto("/library");
  await expect(libraryItem(page, QUESTION)).toContainText("1 of 5 steps explored");
  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  const path = testInfo.outputPath("backup.json");
  await download.saveAs(path);
  const backup = JSON.parse(readFileSync(path, "utf8"));
  expect(backup.version).toBe(3);
  expect(backup.investigations[0].trailProgress).toEqual([
    {
      trailId: "forgiveness-before-the-atonement",
      currentStepId: "mosiah-3-before-he-came", // the step viewed last, after the reload
      steps: [expect.objectContaining({ stepId: "mosiah-3-before-he-came", discoveries: "Belief that Christ would come.", explored: true })],
    },
  ]);
});

test("questions without a trail, and custom questions, keep the standard workflow", async ({ page }) => {
  await page.goto("/investigations/new?question=meaningful-prayer");
  await goToSection(page, "Research");
  await expect(page.getByRole("button", { name: "Record evidence from James 1:5–6" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await expect(page.getByRole("tab", { name: /^Discover/ })).toHaveCount(0);
  await expect(page.getByText("Discovery trail")).toHaveCount(0);

  await page.goto("/investigations/new");
  await goToSection(page, "Research");
  await expect(page.getByRole("tab", { name: /^Discover/ })).toHaveCount(0);
  await openActivity(page, "Challenges");
  await expect(page.getByRole("region", { name: "Research challenge" })).toBeVisible();
});
