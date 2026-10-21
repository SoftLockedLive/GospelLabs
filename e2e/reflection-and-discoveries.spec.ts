import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { RECORD_BEFORE_REFLECTION } from "../src/persistence/legacy-fixtures";
import {
  addEvidence,
  createInvestigation,
  expectSaved,
  getRawRecord,
  goToSection,
  putRawRecord,
  sections,
} from "./helpers";

const saveDialog = (page: Page) => page.getByRole("dialog", { name: "Save a discovery" });
const discoveryList = (page: Page) => page.getByRole("list", { name: "Your discoveries" });
const discovery = (page: Page, title: string) =>
  discoveryList(page)
    .locator(":scope > li")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });

async function saveDiscovery(page: Page, title: string, insight = "", evidence: RegExp[] = []) {
  await page.getByRole("button", { name: /^Save discovery/ }).click();
  const dialog = saveDialog(page);
  await expect(dialog.getByRole("textbox", { name: "Title" })).toBeFocused();
  await dialog.getByRole("textbox", { name: "Title" }).fill(title);
  if (insight) await dialog.getByRole("textbox", { name: "Insight" }).fill(insight);
  for (const name of evidence) await dialog.getByRole("checkbox", { name }).check();
  await dialog.getByRole("button", { name: "Save discovery" }).click();
  await expect(dialog).toBeHidden();
}

test("save discoveries from any section, then review, edit, and delete them in Conclusion", async ({ page }, testInfo) => {
  await createInvestigation(page, "Daily discipleship"); // E1: Luke 9:23, in Research
  await addEvidence(page, "Mark 8:34", "Let him deny himself, and take up his cross.");

  // A title is the only requirement.
  await page.getByRole("button", { name: "Save discovery" }).click();
  await saveDialog(page).getByRole("button", { name: "Save discovery" }).click();
  await expect(saveDialog(page)).toContainText("Give your discovery a short title.");
  await saveDialog(page).getByRole("button", { name: "Cancel" }).click();

  await saveDiscovery(page, "Discipleship is daily", "Both passages describe a daily choice.", [/^E2/]);
  await expect(page.getByRole("button", { name: "Save discovery (1 saved)" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Discovery saved" })).toBeAttached();

  await goToSection(page, "Analysis");
  await saveDiscovery(page, "A question remains");
  await expectSaved(page);

  // Review: wide screens offer a shortcut; every screen has Conclusion.
  if (testInfo.project.name === "desktop") {
    await page.getByRole("button", { name: "2 saved · Review" }).click();
    await expect(page.getByRole("heading", { name: /^Your discoveries/ })).toBeFocused();
  } else {
    await goToSection(page, "Conclusion");
  }
  await expect(discoveryList(page).locator(":scope > li")).toHaveCount(2);
  await expect(discovery(page, "Discipleship is daily")).toContainText("Both passages describe a daily choice.");
  await expect(discovery(page, "Discipleship is daily").getByRole("list")).toContainText("E2Mark 8:34");

  // Edit: rename and link one more piece of evidence.
  await discovery(page, "Discipleship is daily").getByRole("button", { name: /^Edit discovery/ }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit discovery" });
  await expect(editDialog.getByRole("textbox", { name: "Title" })).toHaveValue("Discipleship is daily");
  await editDialog.getByRole("textbox", { name: "Title" }).fill("Following Him is daily");
  await editDialog.getByRole("checkbox", { name: /^E1/ }).check();
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(discovery(page, "Following Him is daily").getByRole("list")).toContainText("E1Luke 9:23");
  await expect(discovery(page, "Following Him is daily").getByRole("list")).toContainText("E2Mark 8:34");

  // Deleting linked evidence keeps the discovery and drops only the link; Undo restores it.
  await goToSection(page, "Research");
  await page.getByRole("button", { name: "Delete E2: Mark 8:34" }).click();
  await goToSection(page, "Conclusion");
  await expect(discovery(page, "Following Him is daily").getByRole("list")).not.toContainText("Mark 8:34");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(discovery(page, "Following Him is daily").getByRole("list")).toContainText("E2Mark 8:34");

  // Deleting a discovery can be undone.
  await discovery(page, "A question remains").getByRole("button", { name: /^Delete discovery/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Discovery removed" })).toBeVisible();
  await expect(discoveryList(page).locator(":scope > li")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(discoveryList(page).locator(":scope > li")).toHaveCount(2);
  await expectSaved(page);

  // Everything survives a reload and goes into backups.
  await page.reload();
  await expect(discovery(page, "Following Him is daily")).toBeVisible();
  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  const path = testInfo.outputPath("backup.json");
  await download.saveAs(path);
  const [saved] = JSON.parse(readFileSync(path, "utf8")).investigations;
  expect(saved.discoveryHighlights.map((h: { title: string; evidenceIds: string[] }) => [h.title, h.evidenceIds.length])).toEqual([
    ["Following Him is daily", 2],
    ["A question remains", 0],
  ]);
});

test("Come unto Christ reflection is optional, saves as you type, and doesn't affect status", async ({ page }) => {
  await createInvestigation(page, "Reflection");
  await goToSection(page, "Conclusion");
  await expect(sections(page).getByRole("button")).toHaveCount(5);
  const card = page.getByRole("region", { name: "Come unto Christ" });
  await expect(card).toContainText("Answer any, all, or none.");

  // Concluding doesn't require a reflection.
  await page.locator("label").filter({ has: page.locator('input[value="concluded"]') }).click();
  await expectSaved(page);

  const learned = card.getByRole("textbox", { name: "What have you learned about Jesus Christ?" });
  const understand = card.getByRole("textbox", { name: "What would you like to understand better?" });
  const follow = card.getByRole("textbox", { name: "How might this influence the way you follow Him?" });
  await learned.fill("He invites rather than compels.");
  await follow.fill("Pray before I study.");
  await card.getByRole("textbox", { name: "Other reflections" }).fill("A quiet assurance.");
  await expectSaved(page);

  await page.reload();
  await expect(learned).toHaveValue("He invites rather than compels.");
  await expect(understand).toHaveValue("");
  await expect(follow).toHaveValue("Pray before I study.");
  await expect(card.getByRole("textbox", { name: "Other reflections" })).toHaveValue("A quiet assurance.");
  await expect(page.locator("main header").getByText("Concluded")).toBeVisible();

  // Answers can be revised or cleared.
  await follow.fill("");
  await expectSaved(page);
  await page.reload();
  await expect(follow).toHaveValue("");
  await expect(learned).toHaveValue("He invites rather than compels.");
});

test("an investigation saved before reflections and discoveries keeps all of its data", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByText("No investigations yet")).toBeVisible();
  await putRawRecord(page, RECORD_BEFORE_REFLECTION);

  await page.goto(`/investigations/view?id=${RECORD_BEFORE_REFLECTION.id}`);
  await goToSection(page, "Conclusion");
  const card = page.getByRole("region", { name: "Come unto Christ" });
  // The earlier "Reflection" notes now appear as "Other reflections".
  await expect(card.getByRole("textbox", { name: "Other reflections" })).toHaveValue("I want to remember this.");
  await expect(page.getByRole("textbox", { name: /What I understand now/ })).toHaveValue("Discipleship is a daily choice.");

  await saveDiscovery(page, "Both passages agree", "", [/^E1/]);
  await expectSaved(page);
  const stored = await getRawRecord(page, RECORD_BEFORE_REFLECTION.id);
  expect(stored).toMatchObject({
    evidenceConnections: RECORD_BEFORE_REFLECTION.evidenceConnections,
    challengeResponses: RECORD_BEFORE_REFLECTION.challengeResponses,
    trailProgress: RECORD_BEFORE_REFLECTION.trailProgress,
    reflectionNotes: "I want to remember this.",
    discoveryHighlights: [expect.objectContaining({ title: "Both passages agree", evidenceIds: ["ev-legacy"] })],
  });
});
